"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Deal, PipelineStage } from "@/types";
import { DealCard } from "./deal-card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import { useTranslations } from "next-intl";

interface PipelineBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  onDealMoved: (dealId: string, newStageId: string) => void;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: Deal) => void;
}

export function PipelineBoard({
  stages,
  deals,
  onDealMoved,
  onAddDeal,
  onEditDeal,
}: PipelineBoardProps) {
  const { defaultCurrency } = useAuth();
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages],
  );

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const stage of sortedStages) map.set(stage.id, []);
    for (const deal of deals) {
      const bucket = map.get(deal.stage_id);
      if (bucket) bucket.push(deal);
    }
    return map;
  }, [sortedStages, deals]);

  const sensors = useSensors(
    // 5px activation distance avoids clicks being interpreted as drags.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Keyboard drag support: focus a card, Space to pick up, arrows to move,
    // Space to drop, Escape to cancel.
    useSensor(KeyboardSensor),
  );

  const activeDeal = activeDealId
    ? deals.find((d) => d.id === activeDealId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDealId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDealId(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id);
    const targetStageId = String(over.id);

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === targetStageId) return;
    if (!sortedStages.some((s) => s.id === targetStageId)) return;

    onDealMoved(dealId, targetStageId);
  }

  function handleDragCancel() {
    setActiveDealId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="pipeline-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 lg:snap-none items-start">
        {sortedStages.map((stage) => {
          const stageDeals = dealsByStage.get(stage.id) ?? [];
          const totalValue = stageDeals.reduce(
            (s, d) => s + Number(d.value || 0),
            0,
          );
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              totalValue={totalValue}
              currency={defaultCurrency}
              onAddDeal={onAddDeal}
              onEditDeal={onEditDeal}
            />
          );
        })}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {activeDeal ? (
          <div className="opacity-90 shadow-2xl">
            <DealCard
              deal={activeDeal}
              stage={
                sortedStages.find((s) => s.id === activeDeal.stage_id) ?? null
              }
              onEdit={() => {}}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>

      <style jsx>{`
        .pipeline-scroll {
          scroll-behavior: smooth;
        }
        @media (hover: none), (pointer: coarse) {
          .pipeline-scroll::-webkit-scrollbar {
            height: 0;
            display: none;
          }
          .pipeline-scroll {
            scrollbar-width: none;
          }
        }
        @media (hover: hover) and (pointer: fine) {
          .pipeline-scroll {
            scrollbar-width: thin;
            scrollbar-color: var(--border) transparent;
          }
          .pipeline-scroll::-webkit-scrollbar {
            height: 8px;
          }
          .pipeline-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .pipeline-scroll::-webkit-scrollbar-thumb {
            background-color: var(--border);
            border-radius: 9999px;
          }
          .pipeline-scroll::-webkit-scrollbar-thumb:hover {
            background-color: var(--muted-foreground);
          }
        }
      `}</style>
    </DndContext>
  );
}

function StageColumn({
  stage,
  deals,
  totalValue,
  currency,
  onAddDeal,
  onEditDeal,
}: {
  stage: PipelineStage;
  deals: Deal[];
  totalValue: number;
  currency: string;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: Deal) => void;
}) {
  const t = useTranslations("Pipelines.board");
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  // Page Breakup (Pagination) State
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  const totalPages = Math.max(1, Math.ceil(deals.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedDeals = useMemo(() => {
    if (pageSize >= 1000) return deals;
    const from = (safePage - 1) * pageSize;
    return deals.slice(from, from + pageSize);
  }, [deals, safePage, pageSize]);

  return (
    <div className="flex w-[85vw] min-w-[280px] max-w-[340px] shrink-0 snap-start flex-col rounded-xl border border-border bg-card shadow-xs lg:w-auto lg:max-w-none lg:flex-1 lg:basis-[280px] lg:shrink lg:snap-none overflow-hidden">
      {/* 3px colored top border indicator */}
      <div
        className="h-[3.5px] w-full"
        style={{ backgroundColor: stage.color }}
      />

      {/* Stage Header (Always visible & fixed inside column) */}
      <div className="p-3.5 border-b border-border/60 bg-card/80 backdrop-blur-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="truncate text-sm font-bold text-foreground">
              {stage.name}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold text-foreground border border-border bg-muted/60"
              title={`${deals.length} total deals in ${stage.name}`}
            >
              {deals.length}
            </span>

            {/* Page Size Selector */}
            {deals.length > 10 && (
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-6 rounded border border-border bg-background px-1 text-[10px] font-semibold text-muted-foreground outline-none focus:border-primary"
                title="Cards per page"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={1000}>All</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
          <span>{formatCurrency(totalValue, currency)}</span>
          {deals.length > 0 && totalPages > 1 && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.2 rounded">
              Page {safePage} of {totalPages}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddDeal(stage.id)}
          className="mt-2.5 h-7 w-full justify-center border border-dashed border-primary/30 bg-primary/5 text-xs font-semibold text-primary hover:border-primary hover:bg-primary/10 hover:text-primary transition-all"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          <span>+ Add Customer</span>
        </Button>
      </div>

      {/* Droppable and Scrollable Cards Region (Internal Scroll) */}
      <div
        ref={setNodeRef}
        className={`p-3 max-h-[calc(100vh-340px)] min-h-[160px] overflow-y-auto flex flex-col gap-2.5 transition-all ${
          isOver
            ? "bg-primary/5 ring-2 ring-dashed ring-primary ring-inset"
            : "bg-muted/15"
        }`}
      >
        {deals.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-border py-12 text-xs text-muted-foreground text-center">
            {t("dropDealHere")}
          </div>
        ) : (
          paginatedDeals.map((deal) => (
            <DraggableDealCard
              key={deal.id}
              deal={deal}
              stage={stage}
              onEdit={onEditDeal}
            />
          ))
        )}
      </div>

      {/* Pagination Footer (Only if total deals exceed page size) */}
      {totalPages > 1 && (
        <div className="p-2.5 border-t border-border/80 bg-card flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-mono text-[10.5px]">
            {Math.min((safePage - 1) * pageSize + 1, deals.length)}-
            {Math.min(safePage * pageSize, deals.length)} of {deals.length}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage(1)}
              className="h-6 w-6 p-0 border-border text-foreground hover:bg-muted"
              title="First Page"
            >
              <ChevronsLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-6 w-6 p-0 border-border text-foreground hover:bg-muted"
              title="Previous Page"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>

            <span className="px-1 text-[11px] font-bold text-foreground">
              {safePage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-6 w-6 p-0 border-border text-foreground hover:bg-muted"
              title="Next Page"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage(totalPages)}
              className="h-6 w-6 p-0 border-border text-foreground hover:bg-muted"
              title="Last Page"
            >
              <ChevronsRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DraggableDealCard({
  deal,
  stage,
  onEdit,
}: {
  deal: Deal;
  stage: PipelineStage;
  onEdit: (deal: Deal) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: "none" }}
    >
      <DealCard deal={deal} stage={stage} onEdit={onEdit} />
    </div>
  );
}
