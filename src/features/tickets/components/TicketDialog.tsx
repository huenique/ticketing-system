  return viewDialogOpen ? (
    <div
      className="fixed inset-0 z-50 bg-white/10 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
    >
      <div className="bg-white w-full max-w-[90vw] mx-auto h-[90vh] rounded-lg shadow-lg flex flex-col">
        {/* Dialog Header */}
        <DialogHeader
          currentTicket={currentTicket}
          currentUser={currentUser}
          isEditLayoutMode={isEditLayoutMode}
          setIsEditLayoutMode={setIsEditLayoutMode}
          handleResetLayout={handleResetLayout}
          addWidget={addWidget}
          handleDialogClose={handleDialogClose}
          openEmailDialog={openEmailDialog}
        />

        <div className="flex-1 overflow-auto p-4"> 