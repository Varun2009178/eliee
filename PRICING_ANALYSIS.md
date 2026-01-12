# Pricing Analysis for Eliee Pro

## Cost Breakdown

### 1. AI Model Costs (OpenRouter)

**Premium Models (150 prompts/month limit):**
- **Claude 3.5 Sonnet**: ~$3-5 per 1M input tokens, ~$15 per 1M output tokens
- **GPT-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Average cost per chat**: ~$0.02-0.05 per conversation (assuming ~500 tokens input, ~500 tokens output)

**150 premium prompts/month cost:**
- Conservative estimate: $3-7.50/month per user
- Average estimate: $4-6/month per user
- High usage estimate: $6-10/month per user

**Free Models (unlimited after premium limit):**
- Gemma, Mistral, Qwen: **FREE** (OpenRouter free tier)
- Cost: $0

### 2. Infrastructure Costs

**Supabase (Database):**
- Free tier: Up to 500MB database, 2GB bandwidth
- Pro tier (if needed): $25/month
- **Estimated cost per user**: ~$0.01-0.05/month (at scale)

**Hosting (Vercel/Next.js):**
- Free tier: 100GB bandwidth, unlimited requests
- Pro tier (if needed): $20/month
- **Estimated cost per user**: ~$0.01-0.03/month (at scale)

**Stripe Fees:**
- 2.9% + $0.30 per transaction
- For $9.99/month: ~$0.59 fee per subscription
- **Net revenue per subscription**: ~$9.40/month

### 3. Total Cost Per User

**Conservative estimate:**
- AI costs: $4/month
- Infrastructure: $0.02/month
- Stripe fees: $0.59/month
- **Total cost**: ~$4.61/month
- **Profit margin**: ~$4.79/month (48% margin)

**Average estimate:**
- AI costs: $5/month
- Infrastructure: $0.03/month
- Stripe fees: $0.59/month
- **Total cost**: ~$5.62/month
- **Profit margin**: ~$4.37/month (44% margin)

**High usage estimate:**
- AI costs: $8/month
- Infrastructure: $0.05/month
- Stripe fees: $0.59/month
- **Total cost**: ~$8.64/month
- **Profit margin**: ~$1.35/month (14% margin)

## Pricing Recommendation

### Current Price: $9.99/month ✅ **GOOD**

**Why $9.99 works:**
1. **Healthy margin**: 44-48% profit margin at average usage
2. **Competitive**: Lower than ChatGPT Plus ($20), Jasper ($39), Copy.ai ($36)
3. **Value proposition**: Unlimited documents + 150 premium prompts + unlimited free AI
4. **Psychological pricing**: Under $10 feels accessible

### Alternative Pricing Options

**Option 1: Keep $9.99/month** (Recommended)
- ✅ Good profit margin
- ✅ Competitive pricing
- ✅ Accessible to individuals

**Option 2: Increase to $14.99/month**
- ✅ Higher profit margin (~$9-10/month)
- ✅ More room for growth
- ⚠️ May reduce conversion rate
- ⚠️ Less competitive

**Option 3: Decrease to $7.99/month**
- ✅ More competitive
- ✅ Higher conversion potential
- ⚠️ Lower profit margin (~$2-3/month)
- ⚠️ Less room for cost increases

## Key Insights

1. **Premium prompts are the main cost driver** - Only counting chat (not verify, paraphrase, etc.) keeps costs predictable
2. **Free models are truly free** - Unlimited free model access after premium limit has $0 cost
3. **Scale benefits** - Infrastructure costs decrease per user as you grow
4. **Stripe fees are significant** - Consider annual plans to reduce fee impact

## Recommendations

1. **Keep $9.99/month** - It's well-positioned for profitability
2. **Monitor usage** - Track average premium prompt usage per user
3. **Consider annual plans** - Offer $99/year (save $20) to reduce Stripe fees
4. **Add usage analytics** - Track which users hit the 150 limit to optimize pricing
5. **Consider tiered pricing** - If costs increase, add a "Pro Plus" tier at $19.99/month with 300 prompts

## Risk Factors

- **AI model price increases**: If Claude/GPT-4 prices go up, margins decrease
- **Heavy users**: Users who max out 150 prompts cost ~$8/month, leaving only $1.35 profit
- **Solution**: Monitor and potentially add usage-based pricing for heavy users

## Conclusion

**$9.99/month is a good price point** that balances:
- ✅ Profitability (44-48% margin)
- ✅ Competitiveness (lower than most competitors)
- ✅ Value (unlimited docs + premium AI)
- ✅ Accessibility (under $10 psychological barrier)

Consider adding an annual plan ($99/year) to improve cash flow and reduce Stripe fees.
