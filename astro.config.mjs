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
						{ label: 'Core Backend', slug: 'architecture/core-backend' },
						{ label: 'UI Frontend', slug: 'architecture/ui-frontend' },
						{ label: 'CLI (orchcli)', slug: 'architecture/cli' },
						{ label: 'Data Flow', slug: 'architecture/data-flow' },
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
