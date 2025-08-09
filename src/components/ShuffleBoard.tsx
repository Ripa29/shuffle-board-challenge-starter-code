import React, { useState, useRef, useCallback, useEffect } from 'react';

interface Card {
  id: string;
  content: string;
  color: string;
  height: number;
  column: 'left' | 'right';
  originalIndex: number;
}

interface DragState {
  isDragging: boolean;
  draggedCard: Card | null;
  dragPosition: { x: number; y: number };
  dropZone: { column: 'left' | 'right'; index: number } | null;
}

const CARD_COLORS = [
  'bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200',
  'bg-purple-200', 'bg-pink-200', 'bg-indigo-200', 'bg-orange-200'
];

const generateRandomCard = (id: string, column: 'left' | 'right', index: number): Card => ({
  id,
  content: `Card ${id}`,
  color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
  height: Math.floor(Math.random() * 100) + 80,
  column,
  originalIndex: index
});

const ShuffleBoard: React.FC = () => {
  const [leftCards, setLeftCards] = useState<Card[]>(() =>
      Array.from({ length: 4 }, (_, i) => generateRandomCard(`L${i + 1}`, 'left', i))
  );

  const [rightCards, setRightCards] = useState<Card[]>(() =>
      Array.from({ length: 4 }, (_, i) => generateRandomCard(`R${i + 1}`, 'right', i))
  );

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedCard: null,
    dragPosition: { x: 0, y: 0 },
    dropZone: null
  });

  const boardRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent, card: Card) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    setDragState({
      isDragging: true,
      draggedCard: card,
      dragPosition: { x: e.clientX, y: e.clientY },
      dropZone: null
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.draggedCard) return;

    const newPosition = { x: e.clientX, y: e.clientY };
    let newDropZone: { column: 'left' | 'right'; index: number } | null = null;

    if (boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const leftColumnRect = {
        left: boardRect.left + 16,
        right: boardRect.left + boardRect.width / 2 - 8,
        top: boardRect.top + 16,
        bottom: boardRect.bottom - 16
      };
      const rightColumnRect = {
        left: boardRect.left + boardRect.width / 2 + 8,
        right: boardRect.right - 16,
        top: boardRect.top + 16,
        bottom: boardRect.bottom - 16
      };

      const targetColumn = dragState.draggedCard.column === 'left' ? 'right' : 'left';
      const targetRect = targetColumn === 'left' ? leftColumnRect : rightColumnRect;
      const targetCards = targetColumn === 'left' ? leftCards : rightCards;

      if (e.clientX >= targetRect.left && e.clientX <= targetRect.right &&
          e.clientY >= targetRect.top && e.clientY <= targetRect.bottom) {
        let insertIndex = 0;
        let cumulativeHeight = targetRect.top + 16;

        for (let i = 0; i < targetCards.length; i++) {
          const cardHeight = targetCards[i].height + 16;
          const cardCenter = cumulativeHeight + cardHeight / 2;

          if (e.clientY < cardCenter) {
            insertIndex = i;
            break;
          }

          cumulativeHeight += cardHeight;
          insertIndex = i + 1;
        }

        newDropZone = { column: targetColumn, index: insertIndex };
      }
    }

    setDragState(prev => ({
      ...prev,
      dragPosition: newPosition,
      dropZone: newDropZone
    }));
  }, [dragState.isDragging, dragState.draggedCard, leftCards, rightCards]);

  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging || !dragState.draggedCard) return;

    if (dragState.dropZone) {
      const sourceColumn = dragState.draggedCard.column;
      const targetColumn = dragState.dropZone.column;
      const targetIndex = dragState.dropZone.index;

      if (sourceColumn === 'left') {
        const newLeftCards = leftCards.filter(c => c.id !== dragState.draggedCard!.id);
        const updatedCard = { ...dragState.draggedCard, column: targetColumn };
        const newRightCards = [...rightCards];
        newRightCards.splice(targetIndex, 0, updatedCard);
        setLeftCards(newLeftCards);
        setRightCards(newRightCards);
      } else {
        const newRightCards = rightCards.filter(c => c.id !== dragState.draggedCard!.id);
        const updatedCard = { ...dragState.draggedCard, column: targetColumn };
        const newLeftCards = [...leftCards];
        newLeftCards.splice(targetIndex, 0, updatedCard);
        setRightCards(newRightCards);
        setLeftCards(newLeftCards);
      }
    }

    setDragState({
      isDragging: false,
      draggedCard: null,
      dragPosition: { x: 0, y: 0 },
      dropZone: null
    });
  }, [dragState, leftCards, rightCards]);

  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  const renderDropIndicator = (column: 'left' | 'right', index: number) => {
    if (!dragState.dropZone ||
        dragState.dropZone.column !== column ||
        dragState.dropZone.index !== index ||
        !dragState.draggedCard) return null;

    return (
        <div
            className="bg-blue-400 rounded-lg transition-all duration-200 ease-out"
            style={{
              height: `${dragState.draggedCard.height}px`,
              width: '100%',
              marginBottom: '16px'
            }}
        />
    );
  };

  const renderCard = (card: Card) => {
    const isDragged = dragState.draggedCard?.id === card.id;
    if (isDragged) return null;

    return (
        <div
            key={card.id}
            className={`${card.color} rounded-lg p-4 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow select-none`}
            style={{
              height: `${card.height}px`,
              width: '200px',
              marginBottom: '16px'
            }}
            onMouseDown={(e) => handleMouseDown(e, card)}
        >
          <div className="font-medium text-gray-800">{card.content}</div>
        </div>
    );
  };

  return (
      <div className="min-h-screen bg-gray-50 p-4 relative">
          <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Shuffle Board</h1>

              <div ref={boardRef} className="flex gap-4 relative">
            {dragState.isDragging && (
                <>
                  <div
                      className="fixed inset-0 bg-opacity-50 pointer-events-none"
                      style={{ zIndex: 40 }}
                  />
                  <div
                      className="fixed rounded-full bg-transparent pointer-events-none"
                      style={{
                        left: dragState.dragPosition.x - 100,
                        top: dragState.dragPosition.y - 100,
                        width: '200px',
                        height: '200px',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                        zIndex: 41
                      }}
                  />
                </>
            )}


            {/* Left Column */}
            <div className="flex-1 bg-white rounded-lg p-4 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Left Column</h2>
              <div className="space-y-0">
                {renderDropIndicator('left', 0)}
                {leftCards.map((card, index) => (
                    <React.Fragment key={card.id}>
                      {renderCard(card)}
                      {renderDropIndicator('left', index + 1)}
                    </React.Fragment>
                ))}
              </div>
            </div>

            {/* Right Column */}
            <div className="flex-1 bg-white rounded-lg p-4 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Right Column</h2>
              <div className="space-y-0">
                {renderDropIndicator('right', 0)}
                {rightCards.map((card, index) => (
                    <React.Fragment key={card.id}>
                      {renderCard(card)}
                      {renderDropIndicator('right', index + 1)}
                    </React.Fragment>
                ))}
              </div>
            </div>

            {/* Dragged Card Preview */}
            {dragState.isDragging && dragState.draggedCard && (
                <div
                    className={`${dragState.draggedCard.color} rounded-lg p-4 shadow-lg pointer-events-none fixed opacity-90`}
                    style={{
                      left: dragState.dragPosition.x - dragOffsetRef.current.x,
                      top: dragState.dragPosition.y - dragOffsetRef.current.y,
                      height: `${dragState.draggedCard.height}px`,
                      width: '200px',
                      zIndex: 1000,
                      transform: 'rotate(5deg)'
                    }}
                >
                  <div className="font-medium text-gray-800">{dragState.draggedCard.content}</div>
                </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default ShuffleBoard;
