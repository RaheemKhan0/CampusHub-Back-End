import { ServerTypes } from "../types";

type SeedServer = {
  name: string;
  slug: string;
  type: (typeof ServerTypes)[number];
  icon?: string;
};

export const seedServers: SeedServer[] = [
  {
    name: "Digital Signal Processing and Audio Programming",
    slug: "digital-signal-processing-and-audio-programming",
    type: "unimodules",
  },
  {
    name: "Project Management",
    slug: "project-management",
    type: "unimodules",
  },
  {
    name: "Advanced Programming – Concurrency",
    slug: "advanced-programming-concurrency",
    type: "unimodules",
  },
  {
    name: "Natural Language Processing",
    slug: "natural-language-processing",
    type: "unimodules",
  },
  {
    name: "Cloud Computing",
    slug: "cloud-computing",
    type: "unimodules",
  },
  {
    name: "Information Security Fundamentals",
    slug: "information-security-fundamentals",
    type: "unimodules",
  },
  {
    name: "Computer Vision",
    slug: "computer-vision",
    type: "unimodules",
  },
  {
    name: "Introduction to Artificial Intelligence",
    slug: "introduction-to-artificial-intelligence",
    type: "unimodules",
  },
  {
    name: "Programming and Mathematics for AI",
    slug: "programming-and-mathematics-for-ai",
    type: "unimodules",
  },
  {
    name: "Agents and Multi Agents Systems",
    slug: "agents-and-multi-agents-systems",
    type: "unimodules",
  },
  {
    name: "User Centred Systems Design",
    slug: "user-centred-systems-design",
    type: "unimodules",
  },
  {
    name: "Semantic Web Technologies and Knowledge Graphs",
    slug: "semantic-web-technologies-and-knowledge-graphs",
    type: "unimodules",
  },
  {
    name: "Hewlett Packard Enterprise: Technology Consulting",
    slug: "hewlett-packard-enterprise-technology-consulting",
    type: "unimodules",
  },
  {
    name: "Web Development",
    slug: "web-development",
    type: "unimodules",
  },
  {
    name: "Principles of Artificial Intelligence",
    slug: "principles-of-artificial-intelligence",
    type: "unimodules",
  },
  {
    name: "Information Retrieval",
    slug: "information-retrieval",
    type: "unimodules",
  },
];
