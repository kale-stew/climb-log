export const formatDate = (date) => {
  const arr = date.split('-')
  return new Date(arr[0], arr[1], arr[2]).toDateString()
}

export const formatElevation = (num) =>
  num && num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
