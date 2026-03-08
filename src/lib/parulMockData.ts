import { BusinessContext } from "@/lib/types/businessContext";
import { StrategySession, TopicOption } from "@/lib/types/strategy";

export const parulContext: BusinessContext = {
    id: "parul-mock-1",
    businessName: "Parul University",
    businessType: "education",
    location: {
        city: "Vadodara",
        region: "Gujarat",
        country: "India"
    },
    services: [
        "Engineering",
        "Management",
        "Medicine",
        "Law",
        "Online Degrees",
        "International Programs"
    ],
    targetAudience: "High school graduates, working professionals seeking higher education, and international students looking for quality education in India.",
    positioning: "A premier university in India offering comprehensive, diverse, and affordable educational programs with global recognition."
};

export const parulStrategy: StrategySession = {
    id: "parul-strat-1",
    businessContextId: "parul-mock-1",
    status: "approved",
    keywordStrategy: {
        primaryKeyword: "Parul University Programs",
        secondaryKeywords: [
            "Best engineering college in Gujarat",
            "Top MBA programs in India",
            "Affordable medical degrees Vadodara",
            "Online degrees Parul University"
        ],
        searchIntent: "informational"
    },
    topicOptions: [
        {
            title: "Why Parul University is the Top Choice for Engineering",
            description: "An in-depth look at the state-of-the-art facilities, expert faculty, and placement opportunities that make Parul University's engineering programs stand out.",
            cannibalizationRisk: false
        },
        {
            title: "Navigating Your Career with an MBA from Parul University",
            description: "Explore how the management programs at Parul University prepare students for leadership roles in the global market, featuring alumni success stories.",
            cannibalizationRisk: false
        },
        {
            title: "A Complete Guide to International Programs at Parul University",
            description: "Everything international students need to know about applying, studying, and thriving at Parul University in India.",
            cannibalizationRisk: false
        }
    ]
};
