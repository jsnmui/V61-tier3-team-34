# AI Services Integration: Rate-Limit Handling & Resiliency

This document details how the DashFetch backend resiliently handles interactions with Groq's LLM APIs, manages rate limits (HTTP `429`), mitigates transient network failures, and ensures database transactions remain atomic.

---

## 1. How Rate-Limit Handling Works

Because DashFetch relies on free-tier LLM endpoints, our API routes are highly vulnerable to rate limits (`429 Too Many Requests`) due to token-per-minute (TPM) or requests-per-minute (RPM) exhaustion.

To handle this gracefully, all outgoing requests to Groq are intercepted and executed inside our central resilience harness: `executeGroqWithRetry()`.

![Retry with backoff architectural process flowchart](https://docs.aws.amazon.com/images/prescriptive-guidance/latest/cloud-design-patterns/images/guide-img/48f618e4-d8ad-490f-982b-7b304dbf76c9/images/9c4b645d-1be4-45ec-84ad-89f2d12b7d1a.png)
*Visualizing Retry and Backoff Cycles*

### The Lifecycle of a Request:
1. **Execution**: The harness executes the provided LLM retrieval logic.
2. **Interception**: If the LLM throws an error, the harness analyzes the error code and message.
3. **Transient Failure Recovery**: If the failure is recognized as a transient rate limit (`429`), token limit (`rate_limit_exceeded`), or a temporary overload (`503 Service Unavailable`), the system recalculates an backoff delay and sleeps before trying again.
4. **Graceful Exhaustion**: If the API exhausts all retry attempts, it intercepts the final error and returns an explicit, clean HTTP `429` status to the client with a user-friendly JSON message, rather than crashing or throwing a generic, opaque HTTP `502 Bad Gateway`.

---

## 2. Retry Strategy & Configuration Options

Our resilience layer uses **Exponential Backoff with Jitter** to space out retries.

![Chart showing how jitter reduces competing client spikes](https://d2908q01vomqb2.cloudfront.net/fc074d501302eb2b93e2554793fcaf50b3bf7291/2017/10/03/exponential-backoff-and-jitter-blog-figure-12.png)
*How Jitter prevents synchronized thundering herds*

If multiple client sessions hit rate limits simultaneously, retrying at identical intervals would generate a "thundering herd" effect, immediately re-triggering rate limits. Applying randomized **Jitter** scatters these requests across a wider, safer timeline.

### Mathematical Strategy

The delay before retry $i$ is calculated using:

$$\text{delay} = \min(\text{initial\_delay} \times \text{backoff\_factor}^i, \text{max\_delay}) \pm \text{jitter}$$

where:
* $\text{jitter}$ is a randomized variation of $\pm 100\text{ms}$ applied to the calculated delay.

### Configuration Constants
These limits are configured inside `@/lib/groq` to adapt timing and traffic characteristics:

| Parameter | Default Value | Purpose |
| :--- | :--- | :--- |
| `MAX_RETRIES` | `3` | Maximum retry attempts before giving up and returning a 429. |
| `INITIAL_DELAY_MS` | `1000` | The base wait time (1 second) before the first retry attempt. |
| `BACKOFF_FACTOR` | `2` | Multiplier applied to successive wait times ($1\text{s} \to 2\text{s} \to 4\text{s}$). |
| `MAX_DELAY_MS` | `8000` | Hard cap (8 seconds) that backoff delays cannot exceed. |

---

## 3. Callback Architecture & Database Resiliency

Our API endpoints use a split-closure execution structure to isolate fragile LLM tasks from critical database updates.

### Decoupled closures
By decoupling the generation logic from the database logic, we guarantee that database write attempts only execute *after* we have obtained clean, fully structured, and validated JSON payloads.

```javascript
// 1. LLM Extraction & Processing
const groqCallFn = async () => {
  const completion = await groq.chat.completions.create({ ... });
  return normalizeQuestions(parseLLMJson(completion));
};

// 2. Local Persistence (Executed safely after a successful LLM cycle)
const supabaseWriteFn = async (generatedQuestions) => {
  const { error } = await supabase
    .from('sessions')
    .update({ questions: generatedQuestions })
    .eq('id', sessionId);
    
  if (error) throw error;
};

// 3. Execution Wrapper
await executeGroqWithRetry(groqCallFn, supabaseWriteFn, "Question Generation");