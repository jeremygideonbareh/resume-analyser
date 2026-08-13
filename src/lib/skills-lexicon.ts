/**
 * Curated skills lexicon (~200 common hard + a few soft skills) used for
 * ATS keyword matching. All entries are lowercase; matching is
 * case-insensitive. Compiled once at module load into boundary-checked
 * regexes so `analyzeResume` never rebuilds them per call.
 */

const SKILL_LIST = [
  // Programming languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'c', 'go',
  'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'dart', 'r',
  'matlab', 'perl', 'lua', 'haskell', 'elixir', 'clojure', 'groovy', 'bash',
  'powershell', 'shell', 'sql', 'nosql', 'html', 'css', 'scss', 'sass',
  'less', 'json', 'xml', 'yaml', 'graphql', 'markdown',
  // Frontend
  'react', 'react.js', 'reactjs', 'next.js', 'nextjs', 'vue', 'nuxt',
  'angular', 'svelte', 'astro', 'remix', 'redux', 'redux-toolkit', 'zustand',
  'mobx', 'tailwind', 'tailwindcss', 'bootstrap', 'material-ui', 'mui',
  'styled-components', 'css-modules', 'webpack', 'vite', 'babel', 'eslint',
  'prettier', 'jest', 'vitest', 'playwright', 'cypress', 'testing-library',
  'storybook', 'three.js', 'd3.js', 'gsap', 'framer-motion', 'webgl',
  'canvas', 'pwa', 'responsive-design', 'accessibility', 'a11y',
  // Backend
  'node.js', 'nodejs', 'express', 'fastify', 'koa', 'nestjs', 'django',
  'flask', 'fastapi', 'rails', 'spring', 'spring-boot', 'laravel', 'symfony',
  'asp.net', 'dotnet', 'gin', 'phoenix', 'rest', 'restful', 'rest-api',
  'microservices', 'websockets', 'grpc', 'rabbitmq', 'kafka', 'redis',
  'memcached', 'elasticsearch', 'mongodb', 'postgresql', 'postgres', 'mysql',
  'sqlite', 'mariadb', 'dynamodb', 'cassandra', 'firebase', 'supabase',
  'prisma', 'sequelize', 'typeorm', 'drizzle', 'knex', 'openapi',
  // Mobile
  'react-native', 'reactnative', 'flutter', 'ios', 'android', 'xcode',
  'android-studio', 'expo', 'swiftui', 'uikit',
  // DevOps / cloud / infra
  'aws', 'azure', 'gcp', 'google-cloud', 'cloud', 'docker', 'kubernetes',
  'k8s', 'terraform', 'ansible', 'jenkins', 'github-actions', 'gitlab-ci',
  'circleci', 'nginx', 'apache', 'linux', 'ubuntu', 'ci/cd', 'devops',
  'sre', 'helm', 'prometheus', 'grafana', 'datadog', 'sentry',
  'opentelemetry', 'istio', 'serverless', 'lambda', 'ec2', 's3',
  'cloudfront', 'vercel', 'netlify', 'heroku', 'cloudflare',
  // Data / ML / analytics
  'pandas', 'numpy', 'scikit-learn', 'sklearn', 'tensorflow', 'pytorch',
  'keras', 'huggingface', 'langchain', 'openai', 'llm', 'machine-learning',
  'deep-learning', 'data-science', 'data-analysis', 'data-engineering',
  'etl', 'spark', 'hadoop', 'hive', 'airflow', 'dbt', 'tableau',
  'power-bi', 'powerbi', 'looker', 'excel', 'google-sheets', 'statistics',
  'a/b testing', 'nlp', 'computer-vision', 'jupyter', 'bigquery', 'snowflake',
  // Design / UX
  'figma', 'sketch', 'adobe-xd', 'photoshop', 'illustrator', 'invision',
  'zeplin', 'ux', 'ux-design', 'ui', 'ui-design', 'wireframe',
  'prototyping', 'design-system', 'web-design', 'graphic-design', 'typography',
  // PM / agile / product
  'jira', 'confluence', 'agile', 'scrum', 'kanban', 'lean', 'trello',
  'asana', 'notion', 'slack', 'product-management', 'product-owner',
  'scrum-master', 'roadmap', 'backlog', 'sprint', 'stakeholder',
  'prioritization', 'kpi', 'okr', 'project-management', 'operations',
  // Marketing / growth
  'seo', 'sem', 'marketing', 'analytics', 'google-analytics', 'adwords',
  'content', 'growth', 'funnel', 'crm', 'salesforce', 'hubspot',
  'email-marketing', 'social-media', 'copywriting',
  // Finance / enterprise
  'sap', 'quickbooks', 'netsuite', 'financial-analysis', 'budgeting',
  'forecasting', 'reporting',
  // Security
  'security', 'cybersecurity', 'penetration-testing', 'owasp', 'encryption',
  'authentication', 'oauth', 'saml', 'jwt', 'sso', 'compliance', 'gdpr',
  'soc2', 'iso-27001', 'threat-modeling', 'vulnerability',
  // Soft skills (small curated set — keep bounded)
  'leadership', 'communication', 'collaboration', 'problem-solving',
  'critical-thinking', 'mentoring', 'coaching', 'negotiation',
  'presentation', 'cross-functional', 'remote', 'time-management',
  'planning', 'strategy',
]

export const SKILLS: ReadonlySet<string> = new Set(SKILL_LIST)

/** [skill, case-insensitive word-boundary regex] pairs, compiled once. */
export const SKILL_PATTERNS: ReadonlyArray<readonly [string, RegExp]> =
  SKILL_LIST.map((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return [skill, new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i')]
  })

/** Find every lexicon skill mentioned in the text (case-insensitive). */
export function findSkills(text: string): string[] {
  const found = new Set<string>()
  for (const [skill, re] of SKILL_PATTERNS) {
    if (re.test(text)) found.add(skill)
  }
  return [...found]
}
