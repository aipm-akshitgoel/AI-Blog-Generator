type DemoFaq = {
  id: number;
  question: string;
  answer: string;
  orderNo: number;
};

type DemoFaqCategory = {
  categoryId: number;
  categoryName: string;
  orderNo: number;
  faqs: DemoFaq[];
};

type DemoPage = {
  id: number;
  universityId: number;
  title: string;
  pageName: string;
  pageSlug: string;
  pageType: "program";
  type: "program";
  programId: number;
  liveUrl: string;
  faqCategories: DemoFaqCategory[];
};

const DEMO_PAGE: DemoPage = {
  id: 9001,
  universityId: 999,
  title: "Online University",
  pageName: "Online University",
  pageSlug: "online-university",
  pageType: "program",
  type: "program",
  programId: 1001,
  liveUrl: "https://online-university.demo/admissions",
  faqCategories: [
    {
      categoryId: 1,
      categoryName: "Admissions & Eligibility",
      orderNo: 1,
      faqs: [
        {
          id: 101,
          question: "Who can apply to Online University programs?",
          answer:
            "Any learner with a recognized 10+2 qualification can apply for undergraduate pathways, and graduates can apply for postgraduate programs. Program-specific eligibility details are shown on each course page.",
          orderNo: 1,
        },
        {
          id: 102,
          question: "Is there an entrance test for admission?",
          answer:
            "Most demo programs use merit-based admissions. Some advanced tracks may include a short aptitude screening to personalize your learning path and cohort support.",
          orderNo: 2,
        },
      ],
    },
    {
      categoryId: 2,
      categoryName: "Learning Experience",
      orderNo: 2,
      faqs: [
        {
          id: 201,
          question: "Are classes live, recorded, or both?",
          answer:
            "The learning model combines live expert-led sessions with recorded modules, quizzes, and project-based assignments so working professionals can study with flexibility.",
          orderNo: 1,
        },
        {
          id: 202,
          question: "How much weekly time should I plan for study?",
          answer:
            "A practical commitment is 6 to 8 hours per week, including lectures, assignments, and discussion forums. This can vary by specialization and project intensity.",
          orderNo: 2,
        },
      ],
    },
    {
      categoryId: 3,
      categoryName: "Career Outcomes",
      orderNo: 3,
      faqs: [
        {
          id: 301,
          question: "Do learners get placement or career support?",
          answer:
            "Yes. The demo setup includes resume reviews, interview prep, portfolio guidance, and periodic hiring events to support internship and job-readiness outcomes.",
          orderNo: 1,
        },
        {
          id: 302,
          question: "Can I upskill while working full-time?",
          answer:
            "Absolutely. Programs are designed for flexibility with evening/weekend live sessions and self-paced recorded content, making them suitable for full-time professionals.",
          orderNo: 2,
        },
      ],
    },
  ],
};

export function buildDemoFaqPagePayload() {
  return {
    success: true,
    data: {
      pages: [DEMO_PAGE],
    },
  };
}

