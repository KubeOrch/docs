// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.kubeorch.dev',
	integrations: [
		starlight({
			title: 'KubeOrch Docs',
			favicon: '/favicon.ico',
			customCss: ['./src/styles/custom.css'],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/KubeOrch' }],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'guides/introduction' },
						{ label: 'Quick Start', slug: 'guides/quickstart' },
					],
				},
				{
					label: 'Architecture',
					items: [
						{ label: 'Ecosystem Overview', slug: 'architecture/ecosystem-overview' },
						{ label: 'Data Flow', slug: 'architecture/data-flow' },
						{
							label: 'Core Backend',
							items: [
								{ label: 'Overview', slug: 'architecture/core/overview' },
								{ label: 'API, Auth & Data Model', slug: 'architecture/core/api-and-auth' },
								{ label: 'Workflow Engine', slug: 'architecture/core/workflow-engine' },
								{ label: 'Real-Time & Monitoring', slug: 'architecture/core/realtime' },
							],
						},
						{
							label: 'UI Frontend',
							items: [
								{ label: 'Overview', slug: 'architecture/ui/overview' },
								{ label: 'Workflow Canvas', slug: 'architecture/ui/canvas' },
								{ label: 'State & Streaming', slug: 'architecture/ui/state-and-streaming' },
							],
						},
						{
							label: 'CLI (orchcli)',
							items: [
								{ label: 'Overview', slug: 'architecture/cli/overview' },
								{ label: 'Commands', slug: 'architecture/cli/commands' },
								{ label: 'Development Modes', slug: 'architecture/cli/dev-modes' },
							],
						},
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Cluster Authentication', slug: 'guides/cluster-authentication' },
						{ label: 'Workflow Lifecycle', slug: 'guides/workflow-lifecycle' },
						{ label: 'Importing Projects', slug: 'guides/importing-projects' },
					],
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'REST API', slug: 'reference/rest-api' },
						{ label: 'Data Models', slug: 'reference/data-models' },
						{ label: 'Configuration', slug: 'reference/configuration' },
					],
				},
			],
		}),
	],
});
