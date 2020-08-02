import pkg from '../../../package.json'

// /prox version
export default async ({ respond }) => {
  await respond(`You are using *v${pkg.version}*.`)
}
