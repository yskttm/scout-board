import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: `file:${__dirname}/prisma/dev.db`,
  },
})
