const universes = Array.from({ length: 7 }, (_, universe) => ({
  id: universe,
  entities: Array.from({ length: 7 }, (_, entity) => entity),
}));

export function MultiverseField() {
  return (
    <div className="multiverse" aria-hidden="true">
      <div className="star-field star-field-a" />
      <div className="star-field star-field-b" />
      <div className="cosmic-thread thread-a" />
      <div className="cosmic-thread thread-b" />
      {universes.map(({ id, entities }) => (
        <div className={`universe universe-${id + 1}`} key={id}>
          <div className="universe-halo" />
          <div className="universe-core"><span>{id + 1}</span></div>
          {entities.map((entity) => (
            <div className={`orbit orbit-${entity + 1}`} key={entity}>
              <i className="entity" />
            </div>
          ))}
        </div>
      ))}
      <div className="overseer-star"><span>50</span><i /><b /></div>
      <div className="space-vignette" />
    </div>
  );
}
