function sendQuickComment() {
    const message = messageInput.value.trim();
    if (!message) {
        alert('אנא כתוב הערה לפני השליחה');
        return;
    }

    const selectedRunners = getSelectedRunners();
    if (!selectedRunners.length) {
        alert('אנא בחר לפחות מתמודד אחד');
        return;
    }

    // שליחת אירוע מיידי לעדכון הבועות
    window.dispatchEvent(new CustomEvent('quickComment:added', {
        detail: {
            shoulderNumbers: selectedRunners,
            message: message
        }
    }));

    // רענון עמוד אם נמצאים בעמוד זחילה
    if (state.currentPage === 'crawling-comments') {
        setTimeout(() => {
            if (window.Pages?.renderCrawlingDrillsCommentsPage) {
                window.Pages.renderCrawlingDrillsCommentsPage();
            }
        }, 50);
    }
}