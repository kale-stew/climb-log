# Kylie's Climb Log

This blog serves as a frontend mirror for a Notion database I have.
The database itself is a fully-encompassing Primary Calendar I use to schedule work,
freelance time, hikes, backpacking trips, and more. I wanted a simple & secure solution
to present a filtered view of this table, and as a [Notion Ambassador](https://www.notion.so/Notion-Ambassadors-99857c0d03e8431ab3c430d0afa1c1fe), I have access to the beta API.
I decided to use that to filter and present the data seen in this climbing log, with
real-time updates (down to 60 seconds) based on changes I make in my own workspace.

The public site can be seen here 👉 [kylies.photos](https://kylies.photos)

## Data

In Notion, each database is returned as an array, with objects to represent the rows within.

```json
[
  {
    "name": "",
    "date": "DD/MM/YYYY",
    "elevation": "",
    "area": "<range>, <state>",
    "href": "/YYYY/<name>" // TODO: helper to automate this & avoid duplicates
  },
  ...
]
```

## Technologies

- [React](https://reactjs.org) (_for now_) as a frontend framework
- [Good 'ol AJAX (in-React)](https://reactjs.org/docs/faq-ajax.html) for API calls
- [Github Pages](https://pages.github.com) for deployment
- [Notion](https://notion.com) on the backend 😎
