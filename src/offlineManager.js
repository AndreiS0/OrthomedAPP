

const QUEUE_KEY = 'offline_appointments_queue';

export const offlineManager = {

    addToQueue: (action, data) => {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
        queue.push({ action, data, timestamp: new Date().getTime() });
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        console.log(`📦 Saved to offline queue: [${action}]`, data);
    },


    getQueue: () => {
        return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    },

    clearQueue: () => {
        localStorage.removeItem(QUEUE_KEY);
    },

    syncWithServer: async () => {
        const queue = offlineManager.getQueue();
        if (queue.length === 0) return;

        console.log(`🔄 Sync ${queue.length} offline actions..`);

        for (let item of queue) {
            try {
                let url = 'https://orthomedapp.onrender.com/api/appointments';
                if (item.action === 'PUT' || item.action === 'DELETE') {
                    url += `/${item.data.id}`;
                }

                await fetch(url, {
                    method: item.action,
                    headers: { 'Content-Type': 'application/json' },
                    body: item.action !== 'DELETE' ? JSON.stringify(item.data) : null
                });

            } catch (error) {
                console.error("Eror at sync an item", error);
                return;
            }
        }


        offlineManager.clearQueue();
        console.log("✅ Syncron complete!");
    }
};