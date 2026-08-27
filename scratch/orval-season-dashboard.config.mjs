export default {
  seasonDashboardContract: {
    input: '../docs/openapi/season-service-v1.yaml',
    output: {
      mode: 'split',
      target: './orval-season-dashboard/generated/season-service.ts',
      schemas: './orval-season-dashboard/generated/model',
      client: 'react-query',
    },
  },
};
