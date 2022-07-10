import minimist from 'minimist'
import prompts from 'prompts'
import { execaCommand } from 'execa'
import {
  blue,
  green,
  lightBlue,
  lightCyan,
  red,
  reset,
  yellow,
} from 'kolorist'

// Avoids autoconversion to number of the project name by defining that the args
// non associated with an option ( _ ) needs to be parsed as a string. See #4606
const argv = minimist(process.argv.slice(2), { string: ['_'] })
const cwd = process.cwd()

const CLIS = [
  {
    name: 'vite',
    color: green,
    command: {
      npm: 'npm create vite@latest',
      yarn: 'yarn create vite',
      pnpm: 'pnpm create vite',
    },
  },
  {
    name: 'next',
    color: yellow,
    command: {
      npm: 'npx create-next-app@latest',
      yarn: 'yarn create next-app',
      pnpm: 'pnpm create next-app',
    },
  },
  {
    name: 'react',
    color: blue,
    command: {
      npm: 'npx create-react-app',
      yarn: 'yarn create react-app',
      pnpm: 'pnpm create react-app',
    },
  },
]

const needTS = ['react', 'next']
const needName = ['react']

async function init() {
  let initCli = argv._[0] || argv.cli || null

  let result: any = {}

  try {
    result = await prompts(
      [
        {
          type: initCli && CLIS.some(c => c.name === initCli.toLowerCase()) ? null : 'select',
          name: 'cli',
          message:
            typeof initCli === 'string' && CLIS.every(c => c.name !== initCli.toLowerCase())
              ? reset(
                `"${initCli}" isn't a valid cli option. Please choose from below: `,
              )
              : reset('Select a cli:'),
          initial: 0,
          choices: CLIS.map((cli) => {
            const cliColor = cli.color
            return {
              title: cliColor(cli.name),
              value: cli,
            }
          }),
          onState: (state) => {
            initCli = state.value.name
          },
        },
        {
          type: cli => needTS.includes(cli?.name.toLowerCase() || initCli.toLowerCase()) ? 'select' : null,
          name: 'typescript',
          message: lightCyan('Do you want to use typescript?'),
          initial: 0,
          choices: [
            { title: green('yes'), value: true },
            { title: green('no'), value: false },
          ],
        },
        {
          type: () => needName.includes(initCli.toLowerCase()) ? 'text' : null,
          name: 'projectName',
          message: lightCyan('Project name:'),
          initial: 'my-app',
        },
      ],
      {
        onCancel: () => {
          throw new Error(`${red('✖')} Operation cancelled`)
        },
      },
    )
  }
  catch (cancelled: any) {
    console.log(cancelled.message)
    return
  }

  // eslint-disable-next-line prefer-const
  let { cli = initCli, typescript = false, projectName = '' } = result

  cli = typeof cli === 'string' ? CLIS.find(c => c.name === cli.toLowerCase()) : cli

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  console.log('\ok. Now run:\n')

  let runScript = `${cli.command[pkgManager]} ${projectName} `

  if (typescript) {
    switch (cli.name) {
      case 'react':
        runScript += '--template typescript'
        break
      case 'next':
        runScript += pkgManager === 'pnpm' ? '-- --ts' : '--typescript'
        break
      default:
        break
    }
  }

  console.log(`  ${lightBlue(runScript)}\n`)

  await execaCommand(`${cli.command.pnpm} ${projectName} ${typescript ? '-- --ts' : ''}`, { stdio: 'inherit', cwd })

  console.log()
}

/**
 * @param {string | undefined} userAgent process.env.npm_config_user_agent
 * @returns object | undefined
 */
function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  }
}

init().catch((e) => {
  console.error(e)
})
