import { ConversationalSearchServiceClient } from "@google-cloud/discoveryengine";

// 1. HARDCODE the endpoint to the EU multi-region
// This bypasses the 404 in europe-north1
const client = new ConversationalSearchServiceClient({
  apiEndpoint: 'eu-discoveryengine.googleapis.com'
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // 2. IMPORTANT: Use 'eu' in the path, NOT 'europe-north1'
    const projectId = "superb-firefly-489705-g3";
    const dataStoreId = "hessonpajayritysnro1_1773038098495";
    const servingConfig = `projects/${projectId}/locations/eu/collections/default_collection/dataStores/${dataStoreId}/servingConfigs/default_config`;

    const request = {
      servingConfig,
      query: { text: message },
      summarySpec: {
        summaryResultCount: 5,
        modelSpec: { version: "stable" } // Let Google route to the best available EU model
      }
    };

    const [response] = await client.converseConversation(request);
    res.json({ text: response.reply?.summary?.summaryText || "Ei tuloksia." });

  } catch (error: any) {
    console.error("ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});
