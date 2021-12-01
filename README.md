# Kylie's Climb Log

This website serves as a public mirror of my private climbing calendar. It gets its data from a queried view of that calendar, which is then parsed and served through a React frontend. The page content itself serves as the trip report- everything down to the photos is being served through the [Notion client](https://developers.notion.com/reference).

<!-- The public site can be seen here 👉 [kylies.photos](https://kylies.photos). -->

<!-- To read more about how I built this, check out [my blog post about it](@TODO). -->

## Technologies

- [NextJS](http://nextjs.org)/[React](https://reactjs.org) on the frontend
- [Notion](https://developers.notion.com/) on the backend 😎
<!-- - [Github Pages](https://pages.github.com) for deployment -->

### Prerequisites to Run Locally

- npm version 7.x
- node version v16.x

## Data

Data is handled through a connection to my personal calendar within Notion. If you'd like to replicate this connection, you'll need to [set up an integration](https://developers.notion.com/docs/getting-started) with a database within your own Notion workspace and update the [`.env.example`](./.env.example) accordingly.

<details>
<summary>In Notion, each database query is returned as an array of objects, each object representing a page and the properties that it carries.</summary>

```json
// Retrieving Notion DBs: https://developers.notion.com/reference/retrieve-a-database
//    returns metadata about the database, not the database's content itself
// Querying Notion DBs: https://developers.notion.com/reference/post-database-query
{
  "object": "list",
  "results": [
    {
      "object": "page",
      "id": "xxxxx",
      ...,
      "parent": {
        "type": "database_id",
        "database_id": "xxx-xxx-xxx"
      },
      "url": "https://www.notion.so/",
      "properties": {
        "hike_title": {},
        "date": {
          "id": "xXxx",
          "type": "date",
          "date": {
            "start": "2020-10-07",
            "end": null
          }
        },
        ...
      }
    },
    ...
  ]
}
```

**Note:** I jump directly to querying this database because I know the properties in advance and don't manipulate the titles when I map over them. If I were to update my calendar from this frontend, or if I needed to sync the property titles with another service, I would _first_ query the database to confirm or update data mappings and _then_ send off this filtered query.

</details>
