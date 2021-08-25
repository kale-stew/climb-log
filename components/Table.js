const Table = ({ data }) => {
  const headers = Object.keys(data[0]).filter((header) => header !== 'id')

  return (
    <table>
      <caption>Climb Log</caption>
      <tbody>
        <tr>
          {headers.map((header, i) => {
            return header === 'href' ? null : <th key={i}>{header}</th>
          })}
        </tr>

        {data.map((climb, i) => {
          return (
            <tr key={i}>
              {Object.keys(climb).map((key, i) => (
                <td key={i}>
                  {key === 'name' && climb[key].href ? (
                    <a href={climb.href}>{climb[key]}</a>
                  ) : key !== 'href' && key !== 'id' ? (
                    climb[key]
                  ) : null}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default Table
