const year = document.getElementById('year')
if (year) year.textContent = new Date().getFullYear()

for (const anchor of document.querySelectorAll('a[href^="#"]')) {
  anchor.addEventListener('click', (event) => {
    const href = anchor.getAttribute('href')
    if (!href || href === '#') return
    const target = document.querySelector(href)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

const downloadLinks = [...document.querySelectorAll('.js-download')]
const versionLabels = [...document.querySelectorAll('.js-version')]
const releaseApi = 'https://api.github.com/repos/Away232323/NYRITH-Client-Releases/releases/tags/latest'
const releasePage = 'https://github.com/Away232323/NYRITH-Client-Releases/releases/latest'

function versionFromAsset(name = '') {
  return name.match(/NYRITH-Setup-(.+)-x64\.exe/i)?.[1] || ''
}

async function loadLatestRelease() {
  try {
    const response = await fetch(releaseApi, { headers: { Accept: 'application/vnd.github+json' } })
    if (!response.ok) throw new Error('No public release yet')
    const release = await response.json()
    const asset = (release.assets || []).find((item) => /NYRITH-Setup-.*-x64\.exe$/i.test(item.name))
    const href = asset?.browser_download_url || release?.html_url || releasePage
    for (const link of downloadLinks) link.href = href
    const version = versionFromAsset(asset?.name)
    if (version) {
      const clean = version.replace(/-alpha\.(\d+)$/i, ' Alpha $1')
      for (const label of versionLabels) label.textContent = `v${clean}`
    }
  } catch {
    for (const link of downloadLinks) link.href = releasePage
  }
}

loadLatestRelease()
