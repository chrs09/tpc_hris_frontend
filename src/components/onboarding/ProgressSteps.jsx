export default function ProgressSteps({ currentStep, steps }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Progress</p>
          <h2 className="text-lg font-bold text-gray-900">
            Step {currentStep} of {steps.length}
          </h2>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {steps[currentStep - 1]?.title}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5 lg:grid-cols-10">
        {steps.map((step) => {
          const isActive = step.id === currentStep;
          const isDone = step.id < currentStep;

          return (
            <div key={step.id} className="space-y-2">
              <div
                className={`h-2 rounded-full ${
                  isDone || isActive ? "bg-black" : "bg-gray-200"
                }`}
              />
              <p
                className={`text-[11px] leading-tight ${
                  isActive ? "font-semibold text-black" : "text-gray-500"
                }`}
              >
                {step.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}