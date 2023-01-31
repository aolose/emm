<script>
  export let items = [];
  export let cols = [];
</script>

<table>
  <thead>
  <tr>
    {#each cols as { name }}
      <th>{name}</th>
    {/each}
  </tr>
  </thead>
  <tbody>
  {#each items as row}
    <tr>
      {#each cols as { key, cell }}
        <td>
          <div>
            {cell ? cell(row) : row[key]}
          </div>
        </td>
      {/each}
    </tr>
  {/each}
  </tbody>
</table>

<style lang="scss">
  table {
    font-size: 14px;
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    background: var(--bg3);

    th {
      line-height: 3;
      font-weight: 400;
    }
  }

  tbody {
    tr {
      &:nth-child(2n) {
        background: var(--bg2);
      }
    }

  }

  tr {

  }

  td {
    div {
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
  }

  th {

  }
</style>