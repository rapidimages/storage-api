export default onProgress

function onProgress (e) {
  const percentage = (e.loaded / e.total) * 100
  return {
    file: e.file,
    total: e.total,
    loaded: e.loaded,
    percentage
  }
}
