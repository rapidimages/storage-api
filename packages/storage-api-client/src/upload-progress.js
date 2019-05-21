export default progress

function progress (files) {
  let offset = 0
  const offsets = files.map((x) => {
    offset += x.size
    return {
      name: x.name,
      offset: offset
    }
  })

  return onProgress

  function onProgress (e) {
    const percentage = ((e.loaded / e.total * 100))
    const file = offsets.filter((x) => e.loaded <= x.offset)[0] || offsets.slice(-1)[0]
    return {
      percentage: percentage,
      total: e.total,
      loaded: e.loaded,
      totalMB: (e.total / 1e+6).toFixed(2) + ' MB',
      uploadedMB: (e.loaded / 1e+6).toFixed(2) + ' MB',
      file: file ? file.name : ''
    }
  }
}
