export default name => (...args) => {
  const filter = window.localStorage.getItem('debug') || ''
  if (filter === '*' || filter.indexOf(name) !== -1) {
    console.log.apply(console, [name + ':'].concat(args))
  }
}
