const year = document.getElementById('year')
if (year) year.textContent = new Date().getFullYear()

// NYRITH favicon + brand artwork
const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/svg+xml'
favicon.href = `favicon.svg?v=nyrith-brand-2`
document.head.appendChild(favicon)

const brandStyle = document.createElement('style')
brandStyle.textContent = `
  .brand-mark {
    color: transparent !important;
    font-size: 0 !important;
    background: url('favicon.svg?v=nyrith-brand-2') center/contain no-repeat !important;
    border: 0 !important;
    box-shadow: none !important;
  }
  .launcher-brand > span {
    display:inline-block !important;
    width:24px !important;
    height:24px !important;
    color:transparent !important;
    font-size:0 !important;
    background:url('favicon.svg?v=nyrith-brand-2') center/contain no-repeat !important;
  }
  .instance-icon {
    color: transparent !important;
    font-size: 0 !important;
    background: url('favicon.svg?v=nyrith-brand-2') center/82% no-repeat, rgba(154,108,255,.08) !important;
  }
  .instance-card > i:first-child {
    color: transparent !important;
    font-size: 0 !important;
    background: url('favicon.svg?v=nyrith-brand-2') center/80% no-repeat !important;
  }
`
document.head.appendChild(brandStyle)

const downloadLinks = [...document.querySelectorAll('.js-download')]
const versionLabels = [...document.querySelectorAll('.js-version')]
const releaseStatus = document.getElementById('releaseStatus')
const releaseSize = document.getElementById('releaseSize')
const releaseApi = 'https://api.github.com/repos/Away232323/NYRITH-Client-Releases/releases/tags/latest'
const releasePage = 'https://github.com/Away232323/NYRITH-Client-Releases/releases/latest'

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

function readableVersion(name = '') {
  const match = name.match(/NYRITH-Setup-(.+)-x64\.exe/i)
  if (!match) return ''
  return match[1].replace(/-alpha\.(\d+)$/i, ' Alpha $1')
}

async function loadRelease() {
  try {
    const response = await fetch(releaseApi, { headers: { Accept: 'application/vnd.github+json' } })
    if (!response.ok) throw new Error('Public release not available yet')
    const release = await response.json()
    const exe = (release.assets || []).find((asset) => /NYRITH-Setup-.*-x64\.exe$/i.test(asset.name))
    const href = exe?.browser_download_url || release.html_url || releasePage
    downloadLinks.forEach((link) => { link.href = href })

    const version = readableVersion(exe?.name)
    if (version) versionLabels.forEach((label) => { label.textContent = `v${version}` })

    if (releaseStatus) releaseStatus.textContent = release.prerelease ? 'Public Alpha' : 'Latest Release'
    if (releaseSize && exe?.size) releaseSize.textContent = `${(exe.size / 1024 / 1024).toFixed(1)} MB · Windows x64`
  } catch {
    downloadLinks.forEach((link) => { link.href = releasePage })
  }
}

loadRelease()
