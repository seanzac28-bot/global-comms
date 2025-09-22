import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ChatService } from "./services/chatService";
import { translationService } from "./services/translationService";
import { insertDictionaryEntrySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user preferred language
  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { preferredLanguage } = req.body;
      
      if (!preferredLanguage) {
        return res.status(400).json({ message: "Preferred language is required" });
      }

      const updatedUser = await storage.upsertUser({
        id: userId,
        email: req.user.claims.email,
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name,
        profileImageUrl: req.user.claims.profile_image_url,
        preferredLanguage,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Dictionary routes
  app.get('/api/dictionary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getDictionaryEntries(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching dictionary entries:", error);
      res.status(500).json({ message: "Failed to fetch dictionary entries" });
    }
  });

  app.post('/api/dictionary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertDictionaryEntrySchema.parse({
        ...req.body,
        userId,
      });

      const entry = await storage.createDictionaryEntry(validatedData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating dictionary entry:", error);
      res.status(500).json({ message: "Failed to create dictionary entry" });
    }
  });

  app.delete('/api/dictionary/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      await storage.deleteDictionaryEntry(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting dictionary entry:", error);
      res.status(500).json({ message: "Failed to delete dictionary entry" });
    }
  });

  // Translation routes
  app.post('/api/translate', isAuthenticated, async (req, res) => {
    try {
      const { text, sourceLanguage, targetLanguage } = req.body;
      
      if (!text || !sourceLanguage || !targetLanguage) {
        return res.status(400).json({ message: "Text, source language, and target language are required" });
      }

      const translation = await translationService.translateText(text, sourceLanguage, targetLanguage);
      res.json(translation);
    } catch (error) {
      console.error("Error translating text:", error);
      res.status(500).json({ message: "Failed to translate text" });
    }
  });

  app.post('/api/detect-language', isAuthenticated, async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const language = await translationService.detectLanguage(text);
      res.json({ language });
    } catch (error) {
      console.error("Error detecting language:", error);
      res.status(500).json({ message: "Failed to detect language" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize chat service with WebSocket
  new ChatService(httpServer);

  return httpServer;
}
