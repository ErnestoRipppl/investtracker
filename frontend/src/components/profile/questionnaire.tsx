"use client";

import * as React from "react";
import { useQuestionnaire, useSubmitQuestionnaire } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { m, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Check, Award, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QuestionnaireProps {
  onSuccess: () => void;
}

export function Questionnaire({ onSuccess }: QuestionnaireProps) {
  const { data: questions, isLoading, isError } = useQuestionnaire();
  const submitMutation = useSubmitQuestionnaire();

  const [currentStep, setCurrentStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [direction, setDirection] = React.useState(1); // 1 for next, -1 for prev

  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8 space-y-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
          <p className="text-sm text-muted-foreground">Cargando cuestionario de perfil...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !questions || questions.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto border-rose-500/20 bg-rose-500/5">
        <CardContent className="p-8 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-rose-500">Error</h3>
          <p className="text-sm text-rose-200">
            No se pudo obtener la lista de preguntas. Por favor, inténtalo de nuevo más tarde.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentStep];
  const progressVal = ((currentStep + 1) / questions.length) * 100;

  const handleSelectOption = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));

    // Auto-advance with a slight delay for better UX, if not the last question
    if (currentStep < questions.length - 1) {
      setTimeout(() => {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      }, 250);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      toast.error("Por favor, selecciona una opción antes de continuar");
      return;
    }
    if (currentStep < questions.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Por favor, responde a todas las preguntas");
      return;
    }

    try {
      await submitMutation.mutateAsync(answers);
      toast.success("¡Perfil evaluado con éxito!");
      onSuccess();
    } catch (error) {
      toast.error((error as Error).message || "Error al enviar las respuestas");
    }
  };

  const getSectionTitle = (sectionKey: string) => {
    switch (sectionKey) {
      case "situacion_financiera":
        return "Situación Financiera";
      case "horizonte_temporal":
        return "Horizonte Temporal";
      case "tolerancia_riesgo":
        return "Tolerancia al Riesgo";
      case "experiencia":
        return "Experiencia en Inversión";
      case "objetivos":
        return "Objetivos de Inversión";
      default:
        return "Perfil Inversor";
    }
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.25, ease: "easeOut" as const },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 50 : -50,
      opacity: 0,
      transition: { duration: 0.2, ease: "easeIn" as const },
    }),
  };

  const isLastStep = currentStep === questions.length - 1;
  const hasSelectedValue = !!answers[currentQuestion.id];

  return (
    <Card className="max-w-2xl mx-auto border-border/50 bg-card/85 backdrop-blur-sm shadow-xl overflow-hidden">
      {/* Top Progress bar */}
      <div className="space-y-1">
        <Progress value={progressVal} className="h-1 rounded-none bg-accent" />
        <div className="px-6 pt-4 flex justify-between items-center text-xs text-muted-foreground font-medium">
          <span className="text-emerald-500 uppercase tracking-wider font-semibold">
            {getSectionTitle(currentQuestion.section)}
          </span>
          <span>
            Pregunta {currentStep + 1} de {questions.length}
          </span>
        </div>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl font-bold leading-relaxed text-foreground">
          {currentQuestion.text}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        <div className="relative min-h-[280px]">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <m.div
              key={currentQuestion.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-3 w-full"
            >
              {currentQuestion.options.map((option) => {
                const isSelected = answers[currentQuestion.id] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectOption(option.value)}
                    disabled={submitMutation.isPending}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left text-sm transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/5 text-emerald-300 shadow-md shadow-emerald-500/5"
                        : "border-border/40 bg-secondary/10 hover:border-emerald-500/30 hover:bg-secondary/20 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="font-medium pr-4">{option.label}</span>
                    <div
                      className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500 text-black"
                          : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </m.div>
          </AnimatePresence>
        </div>

        {/* Action Controls */}
        <div className="flex justify-between items-center pt-4 border-t border-border/10">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0 || submitMutation.isPending}
            className="h-9 px-4 text-xs font-semibold"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Atrás
          </Button>

          {isLastStep ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!hasSelectedValue || submitMutation.isPending}
              className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Award className="h-4 w-4" />
              )}
              Enviar y Evaluar Perfil
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!hasSelectedValue || submitMutation.isPending}
              className="h-9 px-4 text-xs font-semibold"
            >
              Siguiente
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
