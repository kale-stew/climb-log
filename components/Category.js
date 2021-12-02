import utilStyles from '../styles/utils.module.css'

const Category = ({ category }) => {
  switch (category) {
    case 'gear':
      return <div className={utilStyles.gearCategory}>gear</div>
    case 'thoughts':
      return <div className={utilStyles.thoughtsCategory}>thoughts</div>
    case 'hike':
      return <div className={utilStyles.hikeCategory}>trip reports</div>
  }
}

export default Category
