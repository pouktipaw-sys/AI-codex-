import asyncio
import sys
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
def test_real_stdio_transport():
    async def run():
        params=StdioServerParameters(command=sys.executable,args=["-m","flowstate.mcp_server"],env={**os.environ,"FLOW_MCP_SCOPES":"read"})
        async with stdio_client(params) as (reader,writer):
            async with ClientSession(reader,writer) as session:
                await session.initialize()
                result=await session.list_tools()
                assert len(result.tools)==8
                assert all(t.inputSchema and t.outputSchema for t in result.tools)
                incidents=await session.call_tool("list_incidents",{})
                assert not incidents.isError
                denied=await session.call_tool("investigate_incident",{"incident_id":"INC-1042"})
                assert denied.isError
                invalid=await session.call_tool("search_knowledge",{"query":""})
                assert invalid.isError
    asyncio.run(run())
