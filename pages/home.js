import Table from '../components/Table'
import { fetchAllClimbs } from '../utils/notion'

const HomePage = ({ allClimbs }) => <Table data={allClimbs} />

export async function getStaticProps() {
  const response = await fetchAllClimbs()

  return {
    props: {
      allClimbs: response,
    },
  }
}

export default HomePage
