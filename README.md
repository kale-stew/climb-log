# Kylie's Climb Log

This website serves as a public mirror of my private climbing calendar. It gets its data from a queried view of that calendar, which is then parsed and served through a React frontend. The page content itself serves as the trip report- everything down to the photos is being served through the [Notion client](https://developers.notion.com/reference).

The public site can be seen here 👉 [kylies.photos](https://climb-log.vercel.app).

<!-- To read more about how I built this, check out [my blog post about it](@TODO). -->

## Technologies

- [React](https://reactjs.org) on the frontend
- [NextJS](http://nextjs.org) as a build system & for deployment
- [Notion](https://developers.notion.com/) on the backend 😎

### Prerequisites to Run Locally

- npm version 7.x
- node version v16.x

## Data

Data is handled through a connection to my personal calendar within Notion. If you'd like to replicate this connection, you'll need to [set up an integration](https://developers.notion.com/docs/getting-started) with a database within your own Notion workspace and update the [`.env.example`](./.env.example) accordingly.
