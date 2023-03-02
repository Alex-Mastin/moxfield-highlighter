let loading = false
let modifiedElements = []
const observer = new MutationObserver((mutationRecords) => {
  mutationRecords.forEach((mutation) => {
    if (!mutation.addedNodes || !mutation.addedNodes.length) return
    if (mutation.addedNodes[0].className === 'popover show') {
      insertInput(mutation.addedNodes[0].children[1])
    }
  })
})

const init = () => {
  console.log("Loaded Moxfield Highlighter extension.")

  startObserver()
}

const startObserver = () => {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  })
}

const createInputContainer = () => {
  const row = document.createElement('div')
  row.setAttribute('class', 'row mt-3 cardfilterbar')

  const column = document.createElement('div')
  column.setAttribute('class', 'col')

  const label = document.createElement('div')
  label.setAttribute('class', 'mb-1')
  label.textContent = 'Contains:'

  const resultCount = document.createElement('div')
  resultCount.setAttribute('id', 'highlighter-contains-results')
  resultCount.setAttribute('class', 'contains-results-feedback d-large-inline-block')
  resultCount.textContent = ''

  column.innerHTML = `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="spinner" id="loading-spinner" class="loading-spinner svg-inline--fa fa-spinner fa-w-16 fa-spin d-none" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-label="Waiting..."><path fill="currentColor" d="M304 48c0 26.51-21.49 48-48 48s-48-21.49-48-48 21.49-48 48-48 48 21.49 48 48zm-48 368c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48zm208-208c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48zM96 256c0-26.51-21.49-48-48-48S0 229.49 0 256s21.49 48 48 48 48-21.49 48-48zm12.922 99.078c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48c0-26.509-21.491-48-48-48zm294.156 0c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48c0-26.509-21.49-48-48-48zM108.922 60.922c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.491-48-48-48z"></path></svg><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="exclamation-circle" id="contains-error" class="contains-error svg-inline--fa fa-exclamation-circle fa-w-16 text-danger d-none" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248 111.083 248 248zm-248 50c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"></path></svg>`

  column.appendChild(resultCount)
  column.appendChild(label)
  row.appendChild(column)

  return row
}

const createInput = () => {
  const inputContainer = createInputContainer()

  const input = document.createElement('input')
  input.setAttribute('id', 'highlighter-contains')
  input.setAttribute('type', 'text')
  input.setAttribute('class', 'form-control')
  input.setAttribute('placeholder', 'e.g., t:creature o:draw')

  input.addEventListener('change', async (event) => {
    if (loading) return
    removeHighlight()
    hideError()

    if (event.target.value) {
      const response = await queryScryfall(event.target.value)
      highlightResults(response)
    }
  })

  inputContainer.children[0].appendChild(input)

  return inputContainer
}

const insertInput = (highlighter) => {
  const input = createInput()

  /* Insert text input before helper text */
  highlighter.insertBefore(input, highlighter.children[2])
}

const getDeckList = () => {
  const cards = Array.from(document.querySelectorAll('td > a')).map(card => card.innerText)

  return Array.from(new Set(cards))
}

const queryScryfall = async (query) => {
  let request = `https://api.scryfall.com/cards/search?q=${query}`
  const results = []
  const deck = getDeckList()

  startLoading()

  while (true) {
    if (!request) break

    try {
      const response = await fetch(request)
      const cards = await response.json()

      if (cards.object === 'error') throw new Error(cards.details)
      if (cards && cards.data && cards.data.length) {
        results.push.apply(results, cards.data.filter(card => deck.includes(card.name)).map(card => card.name))

        request = cards.next_page
      }
    } catch (error) {
      showError()
      console.error(error)
      break
    }
  }
  stopLoading()

  const resultCount = document.getElementById('highlighter-contains-results')
  resultCount.textContent = `${results.length} cards`

  return results
}

const highlightResults = (cards) => {
  for (let i = 0; i < cards.length; i++) {
    const elements = getElementsByText(cards[i])

    for (let j = 0; j < elements.length; j++) {
      elements[j].className = elements[j].className.replace('text-body', 'text-info')
    }

    modifiedElements = modifiedElements.concat(elements)
  }
}

const removeHighlight = () => {
  for (let i = 0; i < modifiedElements.length; i++) {
    modifiedElements[i].className = modifiedElements[i].className.replace('text-info', 'text-body')
  }

  const resultCount = document.getElementById('highlighter-contains-results')
  resultCount.textContent = ''
}

const startLoading = () => {
  const spinner = document.getElementById('loading-spinner')
  spinner.setAttribute('class', 'loading-spinner svg-inline--fa fa-spinner fa-w-16 fa-spin')
  loading = true
}

const stopLoading = () => {
  const spinner = document.getElementById('loading-spinner')
  spinner.setAttribute('class', 'loading-spinner svg-inline--fa fa-spinner fa-w-16 fa-spin d-none')
  loading = false
}

const showError = () => {
  const error = document.getElementById('contains-error')
  error.setAttribute('class', 'contains-error svg-inline--fa fa-exclamation-circle fa-w-16 text-danger')
}

const hideError = () => {
  const error = document.getElementById('contains-error')
  error.setAttribute('class', 'contains-error svg-inline--fa fa-exclamation-circle fa-w-16 text-danger d-none')
}

const getElementsByText = (str, tag = 'a') => {
  return Array.prototype.slice.call(document.getElementsByTagName(tag)).filter(el => el.textContent.trim() === str.trim())
}

init()
