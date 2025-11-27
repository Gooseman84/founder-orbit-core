import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, ideaId } = await req.json();
    console.log("Generating opportunity report for userId:", userId, "ideaId:", ideaId);

    if (!userId || !ideaId) {
      return new Response(
        JSON.stringify({ error: "userId and ideaId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch idea
    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", ideaId)
      .eq("user_id", userId)
      .single();

    if (ideaError || !idea) {
      console.error("Idea fetch error:", ideaError);
      return new Response(
        JSON.stringify({ error: "Idea not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch analysis
    const { data: analysis, error: analysisError } = await supabase
      .from("idea_analysis")
      .select("*")
      .eq("idea_id", ideaId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analysisError) {
      console.error("Analysis fetch error:", analysisError);
    }

    // Fetch opportunity score
    const { data: score, error: scoreError } = await supabase
      .from("opportunity_scores")
      .select("*")
      .eq("idea_id", ideaId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (scoreError || !score) {
      console.error("Score fetch error:", scoreError);
      return new Response(
        JSON.stringify({ error: "Opportunity score not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Data fetched successfully, generating PDF...");

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    let yPosition = height - 50;

    // Helper function to add text
    const addText = (text: string, size: number, font: any, color = rgb(0, 0, 0)) => {
      if (yPosition < 50) {
        page = pdfDoc.addPage([612, 792]);
        yPosition = height - 50;
      }
      page.drawText(text, {
        x: 50,
        y: yPosition,
        size,
        font,
        color,
      });
      yPosition -= size + 8;
    };

    const addWrappedText = (text: string, size: number, font: any, maxWidth = 500, color = rgb(0, 0, 0)) => {
      const words = text.split(' ');
      let line = '';
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, size);
        
        if (testWidth > maxWidth && line.length > 0) {
          addText(line.trim(), size, font, color);
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      
      if (line.length > 0) {
        addText(line.trim(), size, font, color);
      }
    };

    const addSpace = (amount: number) => {
      yPosition -= amount;
    };

    // Title
    addText("OPPORTUNITY REPORT", 24, helveticaBoldFont, rgb(0.2, 0.2, 0.8));
    addSpace(10);

    // Idea Title
    addText(`Idea: ${idea.title}`, 18, helveticaBoldFont);
    addSpace(5);
    if (idea.description) {
      addWrappedText(idea.description, 12, helveticaFont);
    }
    addSpace(15);

    // Overall Score
    const scoreColor = score.total_score >= 70 
      ? rgb(0, 0.6, 0) 
      : score.total_score >= 40 
        ? rgb(0.8, 0.6, 0) 
        : rgb(0.8, 0, 0);
    
    addText(`Overall Opportunity Score: ${score.total_score}/100`, 16, helveticaBoldFont, scoreColor);
    const scoreLabel = score.total_score >= 70
      ? "Strong Opportunity"
      : score.total_score >= 40
        ? "Moderate Opportunity"
        : "Weak Opportunity";
    addText(scoreLabel, 14, helveticaFont, scoreColor);
    addSpace(15);

    // Sub-scores
    addText("Score Breakdown:", 14, helveticaBoldFont);
    addSpace(5);

    const subScores = score.sub_scores as any;
    const subScoreLabels = [
      { key: 'founder_fit', label: 'Founder Fit' },
      { key: 'market_size', label: 'Market Size' },
      { key: 'pain_intensity', label: 'Pain Intensity' },
      { key: 'competition', label: 'Competition' },
      { key: 'difficulty', label: 'Difficulty' },
      { key: 'tailwinds', label: 'Tailwinds' },
    ];

    for (const { key, label } of subScoreLabels) {
      const value = subScores[key] || 0;
      addText(`  • ${label}: ${value}/100`, 12, helveticaFont);
    }
    addSpace(15);

    // Explanation
    if (score.explanation) {
      addText("Analysis:", 14, helveticaBoldFont);
      addSpace(5);
      addWrappedText(score.explanation, 11, helveticaFont);
      addSpace(15);
    }

    // Recommendations
    if (Array.isArray(score.recommendations) && score.recommendations.length > 0) {
      addText("Recommendations:", 14, helveticaBoldFont);
      addSpace(5);
      for (const rec of score.recommendations) {
        addWrappedText(`• ${String(rec)}`, 11, helveticaFont);
        addSpace(5);
      }
      addSpace(10);
    }

    // Idea Analysis Details (if available)
    if (analysis) {
      addText("Detailed Analysis:", 14, helveticaBoldFont);
      addSpace(10);

      if (analysis.niche_score) {
        addText(`Niche Score: ${analysis.niche_score}/100`, 12, helveticaBoldFont);
        addSpace(5);
      }

      if (analysis.market_insight) {
        addText("Market Insight:", 12, helveticaBoldFont);
        addWrappedText(analysis.market_insight, 11, helveticaFont);
        addSpace(10);
      }

      if (analysis.problem_intensity) {
        addText("Problem Intensity:", 12, helveticaBoldFont);
        addWrappedText(analysis.problem_intensity, 11, helveticaFont);
        addSpace(10);
      }

      if (analysis.competition_snapshot) {
        addText("Competition Snapshot:", 12, helveticaBoldFont);
        addWrappedText(analysis.competition_snapshot, 11, helveticaFont);
        addSpace(10);
      }

      if (analysis.elevator_pitch) {
        addText("Elevator Pitch:", 12, helveticaBoldFont);
        addWrappedText(analysis.elevator_pitch, 11, helveticaFont);
        addSpace(10);
      }

      if (analysis.brutal_honesty) {
        addText("Brutal Honesty:", 12, helveticaBoldFont);
        addWrappedText(analysis.brutal_honesty, 11, helveticaFont);
        addSpace(10);
      }
    }

    // Footer
    const now = new Date().toLocaleDateString();
    page.drawText(`Generated on ${now} | TrueBlazer.AI`, {
      x: 50,
      y: 30,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Serialize PDF to bytes
    const pdfBytes = await pdfDoc.save();

    console.log("PDF generated successfully");

    // Convert to standard ArrayBuffer and return
    return new Response(pdfBytes.buffer.slice(0) as ArrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="opportunity-report-${ideaId}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating report:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate report" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
