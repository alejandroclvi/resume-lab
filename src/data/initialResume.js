// Generic sample content that seeds a fresh install. Your edits live in
// localStorage; use Import/Export in the top bar to move drafts around.
export const initialResume = {
  basics: {
    name: 'Jordan Ellis',
    title: 'Senior Software Engineer',
    location: 'Austin, TX',
    phone: '(512) 555-0180',
    email: 'jordan.ellis@example.com',
    linkedin: 'linkedin.com/in/jordan-ellis',
    github: 'github.com/jordanellis',
  },
  summary:
    'Senior Software Engineer with 8+ years building web platforms end to end — from data models and APIs to polished, accessible frontends. Comfortable owning ambiguous problems, mentoring engineers, and shipping measurable product outcomes.',
  experience: [
    {
      role: 'Senior Software Engineer',
      company: 'Meridian Labs',
      dates: '2023 – Present',
      bullets: [
        'Led the rebuild of the customer dashboard in React and TypeScript, cutting median page load from 3.1s to 900ms and lifting weekly active usage by 22%.',
        'Designed and shipped a usage-based billing service (Node.js, PostgreSQL, Stripe) processing $4M+/year with zero reconciliation incidents.',
        'Mentored four engineers; introduced RFC-driven design reviews that cut rework on large features by roughly a third.',
      ],
    },
    {
      role: 'Software Engineer',
      company: 'Harbor Analytics',
      dates: '2019 – 2023',
      bullets: [
        'Built real-time data pipelines (Kafka, Python) ingesting 50M events/day, powering the alerting features used by 300+ enterprise customers.',
        'Owned the public REST and webhook APIs — versioning, docs, and SDKs — growing third-party integrations from 12 to 90.',
        'Drove the migration from a monolith to services with zero-downtime cutovers.',
      ],
    },
    {
      role: 'Frontend Developer',
      company: 'Brightside Studio',
      dates: '2017 – 2019',
      bullets: [
        'Delivered marketing and e-commerce sites for 20+ clients; standardized a component library that cut build time per project by 40%.',
        'Introduced automated accessibility checks, bringing client sites to WCAG AA.',
      ],
    },
  ],
  skills: [
    { group: 'Languages', items: 'TypeScript, JavaScript, Python, SQL' },
    { group: 'Frontend', items: 'React, Next.js, Tailwind CSS, accessibility (WCAG)' },
    { group: 'Backend', items: 'Node.js, PostgreSQL, Kafka, REST/GraphQL APIs' },
    { group: 'Infra', items: 'AWS, Docker, CI/CD, observability (Grafana, Sentry)' },
  ],
  education: [
    {
      degree: 'B.S. in Computer Science',
      school: 'University of Texas at Austin',
      dates: '2013 – 2017',
    },
  ],
}
