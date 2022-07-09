import minimist from 'minimist'
import prompts from 'prompts'
import { execaCommand } from 'execa'
import {
  green,
  lightBlue,
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
]

async function init() {
  const initCli = argv._[0] || argv.cli || null

  let result = {
    cli: initCli,
  }

  try {
    result = await prompts(
      [
        {
          type: initCli ? null : 'select',
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

  const { cli } = result

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  console.log('\ok. Now run:\n')

  switch (pkgManager) {
    case 'pnpm':
      console.log(`  ${lightBlue(cli.command.pnpm)}\n`)
      await execaCommand(cli.command.pnpm, { stdio: 'inherit', cwd })
      break
    case 'yarn':
      console.log(`  ${lightBlue(cli.command.yarn)}\n`)
      await execaCommand(cli.command.yarn, { stdio: 'inherit', cwd })
      break
    default:
      console.log(`  ${lightBlue(cli.command.npm)}\n`)
      await execaCommand(cli.command.npm, { stdio: 'inherit', cwd })
      break
  }
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
