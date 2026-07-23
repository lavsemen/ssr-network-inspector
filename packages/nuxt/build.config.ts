import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/module',
  ],
  externals: [
    '@lavsemen/ssr-network-inspector-protocol',
  ],
})
