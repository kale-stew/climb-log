const Table = ({ data }) => {
  const headers = Object.keys(data[0]).filter(
    (header) => header !== 'id' && header !== 'href'
  )

  return (
    <table>
      <caption>Climb Log</caption>
      <tbody>
        <tr>
          {headers.map((header, i) => (
            <th key={i}>{header}</th>
          ))}
        </tr>

        {data.map((climb, i) => {
          return (
            <tr key={i}>
              {Object.keys(climb).map(
                (key, i) =>
                  !(key == 'id' || key == 'href') && <td key={i}>{climb[key]}</td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default Table
