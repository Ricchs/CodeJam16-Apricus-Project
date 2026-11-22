import React, { useRef, useState } from "react";

export default function LobbySwipeDeck({ lobbies }) {
  const [choices, setChoices] = useState({});
  const [drag, setDrag] = useState(null);
  const dragStart = useRef(null);
  const lobby = lobbies.find((item) => !Object.hasOwn(choices, item.id));

  if (!lobby) return <p>No more lobbies to swipe through.</p>;

  function choose(liked) {
    dragStart.current = null;
    setDrag(null);
    setChoices((current) => ({ ...current, [lobby.id]: liked }));
  }

  function handlePointerDown(event) {
    if (!event.isPrimary || event.button !== 0) return;
    dragStart.current = {
      pointerId: event.pointerId,
      lobbyId: lobby.id,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ lobbyId: lobby.id, offset: 0 });
  }

  function handlePointerMove(event) {
    const start = dragStart.current;
    if (start?.pointerId !== event.pointerId || start.lobbyId !== lobby.id) return;
    setDrag({ lobbyId: lobby.id, offset: event.clientX - start.x });
  }

  function resetDrag(event) {
    if (dragStart.current?.pointerId !== event.pointerId) return;
    dragStart.current = null;
    setDrag(null);
  }

  function handlePointerUp(event) {
    const start = dragStart.current;
    if (start?.pointerId !== event.pointerId) return;
    resetDrag(event);
    if (start.lobbyId !== lobby.id) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy)) {
      choose(dx > 0);
    }
  }

  const dragging = drag?.lobbyId === lobby.id;
  const offset = dragging ? drag.offset : 0;

  return (
    <section aria-label="Discover lobbies">
      <p>Drag left to skip or right to mark interested.</p>
      <article
        key={lobby.id}
        style={{
          touchAction: "pan-y",
          userSelect: "none",
          cursor: dragging ? "grabbing" : "grab",
          transform: `translateX(${offset}px)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetDrag}
        onLostPointerCapture={resetDrag}
      >
        <h2>{lobby.title}</h2>
        <p>{lobby.location}</p>
      </article>

      <button type="button" onClick={() => choose(false)}>
        Not interested
      </button>
      <button type="button" onClick={() => choose(true)}>
        Interested
      </button>
    </section>
  );
}