import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

type Value = string | number | null

// A minimal D1 stand-in over node:sqlite for unit tests: prepare/bind/first/
// all/run, and batch() as a single transaction like D1.
class Statement {
  constructor(
    private readonly sqlite: DatabaseSync,
    readonly sql: string,
    readonly values: Value[] = [],
  ) {}

  bind(...values: Value[]) {
    return new Statement(this.sqlite, this.sql, values)
  }

  async first<T>() {
    return (this.sqlite.prepare(this.sql).get(...this.values) as T | undefined) ?? null
  }

  async all<T>() {
    return {
      results: this.sqlite.prepare(this.sql).all(...this.values) as T[],
      success: true,
      meta: {},
    }
  }

  async run() {
    return this.execute()
  }

  execute() {
    const info = this.sqlite.prepare(this.sql).run(...this.values)
    return { success: true, results: [], meta: { changes: Number(info.changes) } }
  }
}

export function sqliteD1(migrations: string[] = []): D1Database & { sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:')
  for (const path of migrations) sqlite.exec(readFileSync(path, 'utf8'))
  const db = {
    sqlite,
    prepare: (sql: string) => new Statement(sqlite, sql),
    async batch(statements: Statement[]) {
      sqlite.exec('BEGIN')
      try {
        const results = statements.map(statement => statement.execute())
        sqlite.exec('COMMIT')
        return results
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },
  }
  return db as unknown as D1Database & { sqlite: DatabaseSync }
}
