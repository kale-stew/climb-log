import Layout from '../components/Layout'
import Table from '../components/Table'
import { fetchAllClimbs } from '../utils/notion'

const ClimbLog = ({ allClimbs }) => (
  <Layout>
    <Table data={allClimbs} />
  </Layout>
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
