export type PortfolioProject = {
  repo: string
  tagline: string
  stack: string[]
  workflow: string[]
  screenshots: { src: string; label: string; alt: string }[]
}

const portfolio: Record<string, PortfolioProject> = {
  'CareerGraph AI': {
    repo: 'https://github.com/Harish13052005/careergraph-ai',
    tagline: 'Explore career paths through connected skills, roles, learning resources, and projects.',
    stack: ['FastAPI', 'React', 'Vite', 'React Flow', 'Knowledge graph'],
    workflow: ['Choose a career goal', 'Explore connected roles and skill gaps', 'Follow learning and project recommendations'],
    screenshots: [
      { src: '/portfolio/careergraph/dashboard.jpeg', label: 'Dashboard', alt: 'CareerGraph dashboard' },
      { src: '/portfolio/careergraph/graph.jpeg', label: 'Career graph', alt: 'Interactive career relationship graph' },
      { src: '/portfolio/careergraph/career-path.jpeg', label: 'Career paths', alt: 'Career path recommendations' },
    ],
  },
  'AI Money Mentor': {
    repo: 'https://github.com/Harish13052005/AI_Money_Mentor',
    tagline: 'Turn financial goals into understandable plans, explanations, and a reviewable history.',
    stack: ['Multi-agent AI', 'FastAPI', 'Expo', 'Provider integrations', 'Audit history'],
    workflow: ['Enter a fictional goal and assumptions', 'Review the generated plan and explanation', 'Compare saved records and next actions'],
    screenshots: [
      { src: '/portfolio/money-mentor/dashboard.jpeg', label: 'Dashboard', alt: 'AI Money Mentor dashboard' },
      { src: '/portfolio/money-mentor/financial-plan.jpeg', label: 'Financial plan', alt: 'Example financial plan view' },
      { src: '/portfolio/money-mentor/explanation.jpeg', label: 'Explanation', alt: 'Example financial explanation view' },
    ],
  },
  ParkSense: {
    repo: 'https://github.com/Harish13052005/ParkSense',
    tagline: 'Coordinate parking inventory, compatible bay allocation, reservations, and operations reporting.',
    stack: ['Flask', 'Jinja', 'SQLite', 'Bay allocation', 'Operations analytics'],
    workflow: ['Select a vehicle and reserve or check in', 'Assign a compatible available bay', 'Review occupancy and visit history'],
    screenshots: [
      { src: '/portfolio/parksense/admin-dashboard.jpg', label: 'Admin dashboard', alt: 'ParkSense operations dashboard with bay occupancy map' },
      { src: '/portfolio/parksense/customer-dashboard.jpg', label: 'Customer view', alt: 'ParkSense customer dashboard' },
      { src: '/portfolio/parksense/bay-manager.jpg', label: 'Bay manager', alt: 'ParkSense parking bay management view' },
    ],
  },
}

export const portfolioProject = (name: string) => portfolio[name]
