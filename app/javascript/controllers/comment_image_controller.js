import { Controller } from "stimulus"

export default class extends Controller {
  static targets = ["fileInput", "previewContainer", "textarea"]
  static values = {
    maxImages: Number
  }

  connect() {
    this.maxImagesValue = this.maxImagesValue || 3
    this.uploadedImages = 0
    this.initializeExistingImages()
    this.imageGallery = Array.from(document.querySelectorAll('.comment-image-thumbnail')).map(img => img.src)
    this.imageIndex = 0
  }

  upload(event) {
    event.preventDefault()
    if (this.uploadedImages >= this.maxImagesValue) {
      alert(`Maximum ${this.maxImagesValue} images allowed.`)
      return
    }

    this.fileInputTarget.click()
  }

  handleFileSelect(event) {
    const files = event.target.files

    if (!files || files.length === 0) return

    const remainingSlots = this.maxImagesValue - this.uploadedImages

    if (files.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more image(s).`)
    }

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      this.uploadFile(files[i])
    }

    this.fileInputTarget.value = ""
  }

  uploadFile(file) {
    const formData = new FormData()
    formData.append('photo[image]', file)

    const previewContainer = this.createPreviewElement(file)

    fetch('/photos', {
      method: 'POST',
      body: formData,
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin'
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    })
    .then(data => {
      this.updatePreviewWithUploadedImage(previewContainer, data)
      this.insertImageLink(data.markdown_link)
      this.uploadedImages++
    })
    .catch(error => {
      console.error('Error uploading image:', error)
      previewContainer.remove()
      alert('Failed to upload image. Please try again.')
    })
  }

  createPreviewElement(file) {
    const previewContainer = document.createElement('div')
    previewContainer.className = 'comment-image-preview'

    const loadingIndicator = document.createElement('div')
    loadingIndicator.className = 'comment-image-loading'
    loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'

    previewContainer.appendChild(loadingIndicator)
    this.previewContainerTarget.appendChild(previewContainer)

    return previewContainer
  }

  updatePreviewWithUploadedImage(previewContainer, data) {
    previewContainer.innerHTML = ''

    const img = document.createElement('img')
    img.src = data.url
    img.className = 'comment-image-thumbnail'

    const removeButton = document.createElement('button')
    removeButton.className = 'comment-image-remove btn btn-sm btn-danger'
    removeButton.innerHTML = '<i class="fas fa-times"></i>'
    removeButton.dataset.imageId = data.id
    removeButton.dataset.action = 'click->comment-image#removeImage'

    previewContainer.appendChild(img)
    previewContainer.appendChild(removeButton)
    previewContainer.dataset.imageId = data.id
    previewContainer.dataset.markdown = data.markdown_link

    this.imageGallery.push(data.url);
    this.imageIndex = this.imageGallery.length - 1;
    previewContainer.dataset.imageIndex = this.imageIndex;
  }

  insertImageLink(markdownLink) {
    const textarea = this.textareaTarget
    const startPos = textarea.selectionStart
    const endPos = textarea.selectionEnd

    const beforeText = textarea.value.substring(0, startPos)
    const afterText = textarea.value.substring(endPos)
    const needsSpace = beforeText.length > 0 && !beforeText.endsWith("\n") && !beforeText.endsWith(" ")

    const newLink = (needsSpace ? ' ' : '') + markdownLink + ' '
    textarea.value = beforeText + newLink + afterText
    textarea.focus()
    textarea.setSelectionRange(startPos + newLink.length, startPos + newLink.length)
  }

  removeImage(event) {
    const button = event.currentTarget
    const previewElement = button.closest('.comment-image-preview')
    const imageId = button.dataset.imageId

    if (!imageId) return

    fetch(`/photos/${imageId}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin'
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok')
      previewElement.remove()
      this.uploadedImages--
      const markdownLink = previewElement.dataset.markdown
      if (markdownLink) {
        this.textareaTarget.value = this.textareaTarget.value.replace(markdownLink, '')
      }
    })
    .catch(error => {
      console.error('Error removing image:', error)
      alert('Failed to remove image. Please try again.')
    })
  }

  showFullImage(event) {
    event.preventDefault()
    const imageUrl = event.currentTarget.href
    let modal = document.querySelector('.comment-image-modal')
    if (!modal) {
      modal = document.createElement('div')
      modal.className = 'comment-image-modal'
      document.body.appendChild(modal)
    }

    const image = new Image()
    image.src = imageUrl
    image.className = 'modal-image'
    image.onload = () => {
      modal.classList.add('active')
      modal.querySelector('.modal-image').classList.add('loaded')
    }

    const closeButton = document.createElement('button')
    closeButton.className = 'modal-close'
    closeButton.innerHTML = '<i class="fas fa-times"></i>'
    closeButton.dataset.action = 'click->comment-image#closeModal'

    const counter = document.createElement('div')
    counter.className = 'modal-counter'
    const imageIndex = this.imageGallery.indexOf(imageUrl)
    this.imageIndex = imageIndex
    counter.innerHTML = `${imageIndex + 1}/${this.imageGallery.length}`

    modal.innerHTML = ''
    modal.appendChild(image)
    modal.appendChild(closeButton)
    modal.appendChild(counter)

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal()
    })
  }

  initializeExistingImages() {
    const contentImages = this.element.querySelectorAll('img')
    contentImages.forEach(img => {
      img.style.cursor = 'pointer'
      img.dataset.action = 'click->comment-image#showFullImage'

      const imgSrc = img.getAttribute('src')
      if (!img.parentElement.matches('a') && imgSrc) {
        const wrapper = document.createElement('a')
        wrapper.href = imgSrc
        wrapper.dataset.action = 'click->comment-image#showFullImage'
        wrapper.onclick = (e) => e.preventDefault()

        img.parentNode.insertBefore(wrapper, img)
        wrapper.appendChild(img)
      }
    })
  }

  closeModal() {
    const modal = document.querySelector('.comment-image-modal')
    if (modal) {
      modal.classList.remove('active')
      modal.querySelector('.modal-image').classList.remove('loaded')
    }
    document.removeEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal()
      if (e.key === 'ArrowLeft') this.navigateImage('prev')
      if (e.key === 'ArrowRight') this.navigateImage('next')
    })
  }

  navigateImage(direction) {
    const modal = document.querySelector('.comment-image-modal')
    if (!modal) return

    const newIndex = direction === 'prev' ? this.imageIndex - 1 : this.imageIndex + 1

    if (newIndex < 0 || newIndex >= this.imageGallery.length) return

    modal.querySelector('.modal-image').src = this.imageGallery[newIndex]
    modal.querySelector('.modal-counter').innerHTML = `${newIndex + 1}/${this.imageGallery.length}`
    this.imageIndex = newIndex
  }
}