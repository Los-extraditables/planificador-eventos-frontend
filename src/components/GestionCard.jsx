const GestionCard = ({ item }) => {
  return (
    <li
      style={{
        background: '#242424',
        color: '#fff',
        margin: '12px 0',
        padding: '16px',
        borderRadius: '8px',
        borderLeft: item.urgente ? '5px solid #ff4d4d' : '5px solid #4da6ff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1em' }}>{item.titulo}</h3>
        <span style={{ fontSize: '0.85em', color: '#aaa', marginRight: '15px' }}>
          📁 {item.categoria}
        </span>
        <span style={{ fontSize: '0.85em', color: '#aaa' }}>
          ⏱️ {item.horasEstimadas} hrs estimadas
        </span>
      </div>
      {item.urgente && (
        <span
          style={{
            background: '#ff4d4d22',
            color: '#ff4d4d',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.8em',
            fontWeight: 'bold'
          }}
        >
          URGENTE
        </span>
      )}
    </li>
  );
};

export default GestionCard;