import React from 'react';
import { LESSONS, Lesson, STAGE_GROUPS } from '../data/curriculum';
import { Award, BookOpen, CheckCircle2, ChevronRight, Flame, Layers } from 'lucide-react';

interface CurriculumSidebarProps {
  activeLessonId: string;
  completedLessons: string[];
  onSelectLesson: (lesson: Lesson) => void;
  workspaceMode: 'course' | 'sandbox';
}

const DIFFICULTY_STYLES: Record<Lesson['difficulty'], string> = {
  入门: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  基础: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  进阶: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  高阶: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

export const CurriculumSidebar: React.FC<CurriculumSidebarProps> = React.memo(({
  activeLessonId,
  completedLessons,
  onSelectLesson,
  workspaceMode,
}) => {
  const totalCount = LESSONS.length;
  const doneCount = completedLessons.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);

  return (
    <aside className="w-full lg:w-76 xl:w-82 shrink-0 h-full bg-[#0b101d] border-r border-slate-800/90 flex flex-col select-none overflow-hidden">
      {/* Progress Overview Card */}
      <div className="p-3.5 border-b border-slate-800/90 bg-gradient-to-b from-slate-900/80 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Award className="w-4 h-4 text-amber-400" />
            <span>三阶魔方通关进度</span>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-300">
            {doneCount} / {totalCount} 课 ({progressPct}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Scrollable 3-Stage Course Tree */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {STAGE_GROUPS.map((stage, stageIdx) => {
          const stageDone = stage.lessons.filter((l) =>
            completedLessons.includes(l.id)
          ).length;

          return (
            <div key={stage.id} className="space-y-1.5">
              {/* Stage Header */}
              <div className="px-2 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800/90">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                    {stageIdx === 0 ? (
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    ) : stageIdx === 1 ? (
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{stage.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {stageDone}/{stage.lessons.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  {stage.subtitle}
                </p>
              </div>

              {/* Stage Lesson Items */}
              <div className="space-y-1 pl-1">
                {stage.lessons.map((lesson) => {
                  const isActive =
                    workspaceMode === 'course' && activeLessonId === lesson.id;
                  const isCompleted = completedLessons.includes(lesson.id);

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => onSelectLesson(lesson)}
                      aria-current={isActive ? 'step' : undefined}
                      data-testid={`lesson-item-${lesson.id}`}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer group ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/18 to-blue-600/10 border-cyan-400/60 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
                          : 'bg-slate-900/45 hover:bg-slate-900/90 border-slate-800/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-mono ${
                              isActive
                                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/20'
                                : 'border-slate-600 text-slate-500'
                            }`}
                          >
                            •
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] font-mono font-semibold text-cyan-300/90">
                            {lesson.badge}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${
                              DIFFICULTY_STYLES[lesson.difficulty]
                            }`}
                          >
                            {lesson.difficulty}
                          </span>
                        </div>

                        <div
                          className={`text-xs font-semibold truncate ${
                            isActive
                              ? 'text-white'
                              : 'text-slate-200 group-hover:text-white'
                          }`}
                        >
                          {lesson.title}
                        </div>

                        <div className="mt-1 flex items-center justify-between">
                          <code className="text-[10px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-[170px]">
                            {lesson.formula}
                          </code>
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform ${
                              isActive
                                ? 'text-cyan-400 translate-x-0.5'
                                : 'text-slate-600 group-hover:text-slate-400'
                            }`}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
});
