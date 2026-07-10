import { test, expect } from '@playwright/test';
test("shows the landing hero and primary CTA", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("body")).toContainText(
    "AI-Powered Interview Preparation",
  );
  await expect(
    page.getByRole("heading", { level: 1 }),
  ).toContainText(/Turn any Job Description/i);
  await expect(
    page.getByRole("navigation").getByRole("link", { name: /FAQ/i }),
  ).toBeVisible();
});

test("walks the core interview-prep flow from input to questions", async ({
  page,
}) => {
  await page.route("**/api/ingest", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionId: "mock-session",
        jdText: "Senior frontend engineer role with React and accessibility",
      }),
    });
  });

  await page.route("**/api/parse", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionId: "mock-session",
        extractedJob: {
          job_title: "Senior Frontend Engineer",
          type_of_work: "Hybrid",
          location: "Cape Town",
          experience: "5+ years",
          required_skills: ["React", "Accessibility"],
          tools_and_technologies: ["Next.js", "Tailwind CSS"],
          responsibilities: ["Build UI features", "Improve accessibility"],
        },
      }),
    });
  });

  await page.route("**/api/generate-questions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        questions: {
          technical: [
            { question: "How do you structure a reusable React component?" },
          ],
          behavioral: [
            { question: "Tell me about a time you improved accessibility." },
          ],
          experience: [
            { question: "What is the most complex UI you shipped?" },
          ],
        },
      }),
    });
  });

  await page.goto("/");
  await page
    .getByPlaceholder("Paste the job description here…")
    .fill(
      "We are hiring a senior frontend engineer to build polished user experiences with React, Next.js, and accessibility in mind.",
    );
  await page.getByRole("button", { name: /Generate Questions/i }).click();

  await expect(page).toHaveURL(/\/job-summary$/);
  await expect(
    page.getByRole("heading", { name: /Job Summary/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /View Interview Questions/i }).click();

  await expect(page).toHaveURL(/\/interview-questions$/);
  await expect(
    page.getByRole("heading", { name: /Interview Questions/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/How do you structure a reusable React component/i),
  ).toBeVisible();
});

test("opens the FAQ accordion and shows answers", async ({ page }) => {
  await page.goto("/faq");

  const firstQuestion = page.getByRole("button", {
    name: /What is DashFetch/i,
  });
  await firstQuestion.click();

  await expect(
    page.getByText(/DashFetch is an AI-powered platform/i),
  ).toBeVisible();
});
