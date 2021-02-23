const Table = ({ climbs }) => {
  const headers = Object.keys(climbs[0])

  return (
    <table>
      {/* <caption>Climb Log</caption> */}
      <tbody>
        <tr>
          {headers.map((header, i) => {
            return header === 'href' ? null : <th key={i}>{header}</th>
          })}
        </tr>

        {climbs.map((climb, i) => {
          return (
            <tr key={i}>
              {Object.keys(climb).map((key, i) => (
                <td key={i}>
                  {key === 'name' && climb.href ? (
                    <a href={climb.href}>{climb[key]}</a>
                  ) : key !== 'href' ? (
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
