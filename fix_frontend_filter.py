content = open('src/views/whatsapp/WhatsAppInbox.tsx').read()

# Fix dropdown to use actual project IDs
old = """            <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
              className="text-[10px] font-black bg-white border-2 border-blue-200 rounded-full px-2 py-1 focus:outline-none focus:border-blue-500 text-gray-700 cursor-pointer uppercase">
              <option value="all">🎯 All Ads</option>
              <option value="website">🌐 Website Dev</option>
              <option value="mobileapp">📱 App Dev</option>
              <option value="playstore">🚀 Play Store</option>
              <option value="web3">⛓️ Web3</option>
              <option value="coinlisting">🪙 Coin Listing</option>
              <option value="exchange">💱 Crypto Exchange</option>
            </select>"""

new = """            <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
              className="text-[10px] font-black bg-white border-2 border-blue-200 rounded-full px-2 py-1 focus:outline-none focus:border-blue-500 text-gray-700 cursor-pointer uppercase">
              <option value="all">🎯 All Projects</option>
              <option value="9">💱 Crypto Exchange</option>
              <option value="10">🌐 Web Development</option>
              <option value="11">📈 Digital Marketing</option>
              <option value="12">🎬 Video Editing</option>
              <option value="13">📊 Trading</option>
              <option value="14">📞 Telecaller</option>
              <option value="16">💼 Job Placement</option>
              <option value="17">📞 Hiring Telecaller</option>
              <option value="18">🗺️ State Heads</option>
              <option value="20">🏢 Office Admin</option>
              <option value="21">⭐ Agila Vetri</option>
              <option value="22">🇦🇪 UAE Business</option>
              <option value="26">👩 Office Admins Hiring</option>
            </select>"""

content = content.replace(old, new)
open('src/views/whatsapp/WhatsAppInbox.tsx', 'w').write(content)
print('Frontend filter fixed')
