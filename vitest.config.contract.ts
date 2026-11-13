import { ContractReporter } from '@beecode/msh-test-contractor/contract-reporter'
import { contractYamlPlugin } from '@beecode/msh-test-contractor/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [contractYamlPlugin()],
  test: {
    include: ['src/**/*.contract.yaml', 'src/**/*.test.ts'],
    mockReset: true,
    passWithNoTests: true,
    reporters: [new ContractReporter()],
    watch: false,
  },
})
