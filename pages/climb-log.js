import Table from '../components/Table'
import { fetchAllClimbs } from '../utils/notion'

const ClimbLog = ({ allClimbs }) => (
  <div className="wrapper">
    <Table data={allClimbs} />
  </div>
)

export async function getStaticProps() {
  const response = await fetchAllClimbs()

  return {
    props: {
      allClimbs: response,
    },
  }
}

export default ClimbLog
